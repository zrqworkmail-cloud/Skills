#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Structural pre-render gate for footage-backed shots.

Why this exists: LoopingVideo slices a short I2V plate across a long shot by
setting `slice = round(clipSeconds * 30 / rate)` output frames. Every slice
restarts the plate from `startFrom`, so the plate must be long enough to cover
the *largest* slice at the chosen rate. When it is not, Remotion does not error -
the clip silently wraps and cross-fades with itself in the middle of the shot.
That bug survived two full renders (v26/v27) and was only caught by measuring
per-frame luma afterwards, which costs a whole render window. This gate reads the
same numbers off the source and the media files in about a second, before any
render starts.

Checks, per footage usage found in remotion/src/scenes/*.tsx:
  WRAP    largest slice consumes more source frames than the plate has  -> FAIL
  OFFSET  startFrom + needed exceeds the plate                          -> FAIL
  SLICE   clipSeconds longer than the plate's own duration              -> WARN
  SCALE   plate resolution below the composition                        -> INFO
  UNKNOWN rate/frames that the script could not resolve                 -> FAIL

Usage (Windows python needs native paths; git-bash /<drive>/... raises WinError 2):
  python3 -X utf8 scripts/plate_gate.py [--json]
"""
from __future__ import annotations
import shutil

import argparse
import ast
import glob
import json
import math
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.environ.get("PROJECT") or os.getcwd())
SRC = os.path.join(ROOT, "remotion", "src")
PUBLIC = os.path.join(ROOT, "remotion", "public")
FFPROBE = os.environ.get("FFPROBE") or shutil.which("ffprobe") or "ffprobe"
COMP_FPS = 30.0
DEFAULT_CLIP_SECONDS = 3.04  # LoopingVideo's own default, components/Media.tsx
# Component defaults from remotion/src/components/Media.tsx — an omitted `rate`
# is not "no rate", it is these numbers.
DEFAULT_RATE = {"LoopingVideo": 0.75, "FootageBed": 0.55}
FADE_FRAMES = 14  # LoopingVideo's default `fade`; FootageBed passes 10
STILL_TAGS = {"StillBed", "StillLayer"}
MEDIA_TAGS = ("LoopingVideo", "FootageBed", "StillBed", "StillLayer", "OffthreadVideo")

rate_re = re.compile(r"rate\s*=\s*\{\s*([0-9.]+)\s*\}")
rate_fn_re = re.compile(r"rate\s*=\s*\{\s*(\w+)\(\s*frames\s*\)\s*\}")
src_re = re.compile(r"""src\s*=\s*["`]([^"'`]+)["`]|\bsrc\s*=\s*\{\s*["`]([^"'`]+)["`]""")
clip_re = re.compile(r"clipSeconds\s*=\s*\{\s*([0-9.]+)\s*\}")
fade_re = re.compile(r"fade\s*=\s*\{\s*(\d+)\s*\}")
start_re = re.compile(r"startFrom\s*=\s*\{\s*(\d+)\s*\}")
plate_rate_def_re = re.compile(
    r"const\s+(\w+)\s*=\s*\(\s*frames[^)]*\)\s*=>\s*([^;]+);"
)
case_re = re.compile(r"case\s+[\"']([^\"']+)[\"']\s*:\s*return\s*<(\w+)")


def sh(path: str, *args: str) -> str:
    return subprocess.run([path, *args], capture_output=True, text=True).stdout


def probe(absolute: str):
    out = sh(
        FFPROBE,
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=nb_frames,avg_frame_rate,width,height,duration",
        "-of",
        "json",
        absolute,
    )
    try:
        s = (json.loads(out or "{}").get("streams") or [{}])[0]
    except json.JSONDecodeError:
        return None
    num, _, den = (s.get("avg_frame_rate") or "0/1").partition("/")
    fps = float(num) / float(den or 1) if den else 0.0
    n = int(s.get("nb_frames") or 0)
    if not n and s.get("duration"):
        n = round(float(s["duration"]) * fps)
    return {
        "frames": n,
        "fps": fps,
        "duration": n / fps if fps else 0.0,
        "width": int(s.get("width") or 0),
        "height": int(s.get("height") or 0),
    }


def load_shots():
    text = open(os.path.join(SRC, "data", "timeline.ts"), encoding="utf-8").read()
    start = text.index("export const SHOTS")
    body = text[text.index("[", start) : text.rindex("]")]
    shots = {}
    for m in re.finditer(
        r"\{\s*\"id\":\s*\"([^\"]+)\"[\s\S]{0,200}?\"dur\":\s*(\d+)", body
    ):
        shots[m.group(1)] = int(m.group(2))
    return shots


def load_dispatch():
    text = open(os.path.join(SRC, "Film.tsx"), encoding="utf-8").read()
    comp2shots: dict[str, list[str]] = {}
    for shot, comp in case_re.findall(text):
        comp2shots.setdefault(comp, []).append(shot)
    return comp2shots


def arith(expr: str, frames: int):
    """Evaluate a `frames`-in-only arithmetic expression. Deliberately not eval():
    scene files are source we read, and a helper in this pipeline must not run
    whatever a hand-edited .tsx happens to contain. Anything outside this small
    grammar returns None and the row is reported as UNRESOLVED."""
    try:
        tree = ast.parse(expr.strip(), mode="eval")
    except SyntaxError:
        return None

    def ev(node):
        if isinstance(node, ast.Expression):
            return ev(node.body)
        if isinstance(node, ast.Constant):
            return float(node.value) if isinstance(node.value, (int, float)) else None
        if isinstance(node, ast.Name):
            return float(frames) if node.id == "frames" else None
        if isinstance(node, ast.BinOp) and isinstance(
            node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod)
        ):
            a, b = ev(node.left), ev(node.right)
            if a is None or b is None:
                return None
            if isinstance(node.op, ast.Div):
                return a / b if b else None
            if isinstance(node.op, ast.FloorDiv):
                return a // b if b else None
            if isinstance(node.op, ast.Mod):
                return a % b if b else None
            return a + b if isinstance(node.op, ast.Add) else (
                a * b if isinstance(node.op, ast.Mult) else a - b
            )
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            a = ev(node.operand)
            return None if a is None else (a if isinstance(node.op, ast.UAdd) else -a)
        if isinstance(node, ast.Call):
            fname = (
                node.func.id
                if isinstance(node.func, ast.Name)
                else node.func.attr
                if isinstance(node.func, ast.Attribute)
                else None
            )
            if fname in ("round", "floor", "ceil", "abs", "min", "max") and node.args:
                vals = [ev(a) for a in node.args]
                if any(v is None for v in vals):
                    return None
                if fname == "round":
                    return float(round(vals[0]))
                if fname == "floor":
                    return float(math.floor(vals[0]))
                if fname == "ceil":
                    return float(math.ceil(vals[0]))
                if fname == "abs":
                    return abs(vals[0])
                return float(min(vals) if fname == "min" else max(vals))
        return None

    return ev(tree)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    shots = load_shots()
    comp2shots = load_dispatch()

    cache: dict[str, dict | None] = {}
    rows: list[dict] = []

    for path in sorted(glob.glob(os.path.join(SRC, "scenes", "*.tsx"))):
        comp = os.path.basename(path)[: -len(".tsx")]
        text = open(path, encoding="utf-8").read()
        # inline `const plateRate = (frames: number) => 49 / frames;`
        lambdas = {
            name: expr for name, expr in plate_rate_def_re.findall(text)
        }
        ids = comp2shots.get(comp, [])
        if not ids:
            continue  # component not mounted on the timeline
        for tag in MEDIA_TAGS:
            for m in re.finditer(rf"<{tag}\b([\s\S]*?)\/?>", text):
                attrs = m.group(1)
                src = src_re.search(attrs)
                if not src:
                    continue
                rel = (src.group(1) or src.group(2)).split("/")[-1]
                cand = glob.glob(os.path.join(PUBLIC, "**", rel), recursive=True) or \
                    glob.glob(os.path.join(ROOT, "assets", "**", rel), recursive=True)
                key = cand[0] if cand else None
                if key not in cache:
                    cache[key] = probe(key) if key else None
                info = cache[key]
                still = tag in STILL_TAGS
                fade = (
                    int(fade_re.search(attrs).group(1))
                    if fade_re.search(attrs)
                    else (10 if tag == "FootageBed" else FADE_FRAMES)
                )
                rate, how, pending_expr = None, "literal", None
                if rate_re.search(attrs):
                    rate = float(rate_re.search(attrs).group(1))
                elif rate_fn_re.search(attrs):
                    fn = rate_fn_re.search(attrs)
                    expr = lambdas.get(fn.group(1))
                    how = f"{fn.group(1)}() -> {expr.strip()}" if expr else fn.group(1)
                    pending_expr = expr
                elif tag in DEFAULT_RATE:
                    rate, how = DEFAULT_RATE[tag], "component default"
                elif still:
                    rate, how = 1.0, "still (no playback)"
                clip = float(clip_re.search(attrs).group(1)) if clip_re.search(attrs) else DEFAULT_CLIP_SECONDS
                off = int(start_re.search(attrs).group(1)) if start_re.search(attrs) else 0

                for sid in ids:
                    frames = shots.get(sid, 0)
                    r = rate
                    if r is None and pending_expr is not None:
                        r = arith(pending_expr, frames)
                    row = {
                        "shot": sid,
                        "scene": comp,
                        "tag": tag,
                        "plate": rel if key else "NOT FOUND",
                        "rate": r,
                        "rate_source": how if r is not None else "UNRESOLVED",
                        "shot_frames": frames,
                        "clip_seconds": clip,
                        "start_from": off,
                    }
                    if still:
                        # A still has no playback maths. Only existence and scale matter.
                        problems = []
                        if not info:
                            row["status"] = "FAIL"
                            problems = ["MISSING: asset not found under public/ or assets/"]
                        else:
                            row["plate_frames"] = info["frames"]
                            row["plate_size"] = f"{info['width']}x{info['height']}"
                            row["status"] = "OK"
                            if info["height"] < 1920 or info["width"] < 1080:
                                row["status"] = "INFO"
                                problems = [
                                    f"SCALE: {info['width']}x{info['height']} upscaled into 1080x1920"
                                ]
                        row["problems"] = problems
                        rows.append(row)
                        continue
                    if info and r is not None and frames:
                        slice_out = max(2, round(clip * COMP_FPS / r))
                        largest = min(slice_out + fade, frames)

                        def consume(n):
                            return n * r * (info["fps"] or COMP_FPS) / COMP_FPS

                        avail = info["frames"] - off
                        needed = consume(largest)
                        body = consume(min(slice_out, frames))
                        # The part of a slice that plays while the next slice is fading
                        # over it is invisible by construction, so an overrun that lives
                        # only inside the fade is masked, not fixed.
                        masked = consume(fade) if frames > slice_out else 0.0
                        row.update(
                            plate_frames=info["frames"],
                            plate_fps=round(info["fps"], 3),
                            plate_dur=round(info["duration"], 3),
                            plate_size=f"{info['width']}x{info['height']}",
                            slice_out=slice_out,
                            largest_slice=largest,
                            needed=round(needed, 1),
                            body=round(body, 1),
                            margin=round(avail - body, 1),
                            headroom=round((avail - needed) / max(1, avail) * 100, 1),
                        )
                        fails, warns, infos = [], [], []
                        if body > avail + 1e-6:
                            fails.append(
                                f"RUNOUT: slice body needs {body:.1f} of {avail} source "
                                f"frames -> the plate ends mid-slice, in plain view"
                            )
                        elif needed > avail + 1e-6:
                            warns.append(
                                f"TAIL: last {needed - avail:.1f} source frames of the slice "
                                f"are past the plate, masked by the crossfade "
                                f"(mask budget {masked:.1f}) - zero margin, do not raise the rate"
                            )
                        if clip * (info["fps"] or COMP_FPS) > info["frames"] + 0.5:
                            note = (
                                "harmless: the shot is shorter than one slice"
                                if frames <= slice_out
                                else "every slice overshoots the plate"
                            )
                            (infos if frames <= slice_out else warns).append(
                                f"SLICE: clipSeconds {clip}s > plate {info['duration']:.2f}s "
                                f"({note})"
                            )
                        if info["height"] < 1920 or info["width"] < 1080:
                            infos.append(
                                f"SCALE: {info['width']}x{info['height']} -> 1080x1920 "
                                f"({1080 / max(1, info['width']):.2f}x upscale)"
                            )
                        row["status"] = (
                            "FAIL" if fails else "WARN" if warns else "INFO" if infos else "OK"
                        )
                        row["problems"] = fails + warns + infos
                    else:
                        row["status"] = "FAIL"
                        row["problems"] = (
                            ["MISSING: no ffprobe data for this plate"]
                            if not info
                            else ["UNKNOWN: rate expression not resolvable, look by hand"]
                        )
                    rows.append(row)

    bad = [r for r in rows if r["status"] == "FAIL"]
    warn = [r for r in rows if r["status"] == "WARN"]
    info_only = [r for r in rows if r["status"] == "INFO"]
    unparsed = sorted(set(comp2shots) - {r["scene"] for r in rows})

    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=1))
    else:
        hdr = (
            f"{'shot':<17}{'scene':<22}{'plate':<26}{'rate':<7}"
            f"{'slice':<7}{'body':<7}{'have':<6}{'margin':<8}{'tail':<6}status"
        )
        print(hdr)
        print("-" * len(hdr))
        for r in sorted(rows, key=lambda x: x["shot"]):
            print(
                f"{r['shot']:<17}{r['scene']:<22}{r['plate'][:24]:<26}"
                f"{('%.3f' % r['rate']) if r['rate'] is not None else r['rate_source']:<7}"
                f"{r.get('slice_out', '-'):<7}{r.get('body', '-'):<7}"
                f"{r.get('plate_frames', '-'):<6}{r.get('margin', '-'):<8}"
                f"{r.get('headroom', '-'):<6}{r['status']}"
            )
            for p in r.get("problems", []):
                print(f"        ! {p}")
        print(
            f"\n{len(rows)} media usages across "
            f"{len({r['scene'] for r in rows})} scenes: "
            f"{len(bad)} FAIL, {len(warn)} WARN, {len(info_only)} INFO-only"
        )
        if unparsed:
            print(
                f"coverage gap: {len(unparsed)} mounted scenes carry no tag this gate reads "
                f"(vector-only, or raw <Img>/<OffthreadVideo>): {', '.join(unparsed)}"
            )

    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

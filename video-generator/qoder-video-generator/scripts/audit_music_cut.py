# -*- coding: utf-8 -*-
"""Audit a cut against its own timeline: bar-locked cuts, caption fit, scene coverage.

Duration is never a constant here. It comes from spec/beat_timeline.json, so the
same audit runs on a 40 s clip and a 9 min documentary.
"""
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.environ.get("PROJECT") or os.getcwd())
ALLOWED_RATE = 7.2  # Chinese characters per second for short on-screen lines
DEFAULT_MIX = "remotion/public/audio/mix.wav"
DEFAULT_BED = "build/audio/bed.wav"
problems = []
warnings = []


def clean_len(text):
    return len(re.sub(r"[^\w\u4e00-\u9fff%]", "", text))


def probe_duration(path):
    fp = os.environ.get("FFPROBE") or shutil.which("ffprobe") or \
        "ffprobe"
    try:
        p = subprocess.run(
            [fp, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", path],
            capture_output=True, text=True,
        )
        return float(p.stdout.strip())
    except (ValueError, OSError):
        return None


def duration_problem(path, target, label):
    dur = probe_duration(path)
    try:
        shown = os.path.relpath(path, ROOT)
    except ValueError:
        shown = os.path.basename(path)
    if dur is None:
        return f"could not read {label} duration ({shown})"
    if abs(dur - target) > 0.05:
        return f"{label} duration {dur:.3f}s != timeline {target:.3f}s"
    return None


def main():
    tl = json.load(open(os.path.join(ROOT, "spec", "beat_timeline.json"), encoding="utf-8"))
    FPS = float(tl["fps"])
    FILM_FRAMES = int(tl["film_frames"])
    spec = json.load(open(os.path.join(ROOT, "spec", "shotlist.json"), encoding="utf-8"))
    cut_grid = spec.get("cut_grid", "bar")
    audio = spec.get("audio") or {}
    audio_mode = audio.get("mode", "remotion")
    if cut_grid not in ("bar", "caption"):
        problems.append(f"unknown cut_grid {cut_grid!r} (expected bar|caption)")
    if audio_mode not in ("remotion", "post_mux", "none"):
        problems.append(f"unknown audio.mode {audio_mode!r} "
                        f"(expected remotion|post_mux|none)")
    ana_path = os.path.join(ROOT, "build", "bgm_analysis.json")
    if os.path.exists(ana_path):
        downbeats = json.load(open(ana_path, encoding="utf-8"))["downbeats"]
    elif cut_grid == "bar":
        downbeats = []
        problems.append("build/bgm_analysis.json missing (required for cut_grid: bar)")
    else:
        downbeats = []
        warnings.append("build/bgm_analysis.json missing: bar-grid report skipped")
    shots = tl["shots"]
    lines = tl["lines"]

    spec_texts = [
        t.strip()
        for shot in spec["shots"]
        for t in shot.get("narration", "").split("\n")
        if t.strip()
    ]
    if len(shots) != len(spec["shots"]):
        problems.append(f"shot count {len(shots)} != shotlist {len(spec['shots'])}")
    if len(lines) != len(spec_texts):
        problems.append(f"line count {len(lines)} != shotlist narration {len(spec_texts)}")
    if shots[0]["start"] != 0:
        problems.append("first shot does not start at 0")
    if shots[-1]["start"] + shots[-1]["dur"] != FILM_FRAMES:
        problems.append("last shot does not end at film end")

    bar_off = []
    for i in range(1, len(shots)):
        if shots[i]["start"] != shots[i - 1]["start"] + shots[i - 1]["dur"]:
            problems.append(f"gap/overlap before {shots[i]['id']}")
        if not downbeats:
            continue
        ts = shots[i]["start"] / FPS
        err = min(abs(ts - d) for d in downbeats) * FPS
        if err > 1.0:
            bar_off.append((shots[i]["id"], err))
            if cut_grid == "bar":
                problems.append(f"{shots[i]['id']} cut is {err:.2f} frames off the bar grid")
            else:
                print(f"  cut {shots[i]['id']:22s} frame {shots[i]['start']:4d}  "
                      f"bar err {err:+.2f}f (caption-led: reported only)")
        else:
            print(f"  cut {shots[i]['id']:22s} frame {shots[i]['start']:4d}  bar err {err:+.2f}f")
    if bar_off and cut_grid == "caption":
        errs = sorted(e for _, e in bar_off)
        med = errs[len(errs) // 2]
        within80 = sum(1 for e in errs if e <= 0.080 * FPS)
        warnings.append(
            f"cut_grid=caption: {len(bar_off)}/{len(shots) - 1} cuts off the bar grid "
            f"(median {med:.2f}f = {med / FPS * 1000:.0f} ms; "
            f"within 80 ms: {within80}/{len(bar_off)})"
        )
        warnings.append("bar alignment is a declared non-goal for this film; "
                        "do not stretch the picture to fix it")

    line_by_id = {l["i"]: l for l in lines}
    used = set()
    for idx, (shot, src) in enumerate(zip(shots, spec["shots"])):
        if shot["id"] != src["id"]:
            problems.append(f"shot order mismatch {shot['id']} vs {src['id']}")
        texts = [t.strip() for t in src.get("narration", "").split("\n") if t.strip()]
        got = [line_by_id[i]["text"] for i in shot["lines"]]
        if got != texts:
            problems.append(f"{shot['id']} captions do not match narration")
        hold_bars = src.get("caption_hold_bars")
        # A held line may run on across the following wordless shots, but it may
        # never reach a shot that carries its own caption.
        limit = shot["start"] + shot["dur"] - 2
        if hold_bars:
            if len(shot["lines"]) != 1:
                problems.append(f"{shot['id']} sets caption_hold_bars on a multi-line shot")
            for nxt in shots[idx + 1:]:
                if nxt["lines"]:
                    break
                limit = nxt["start"] + nxt["dur"] - 2
        for lid in shot["lines"]:
            l = line_by_id[lid]
            used.add(lid)
            if l["start"] < shot["start"] + 2 or l["end"] > limit:
                problems.append(f"line {lid} outside {shot['id']} (hold={hold_bars})")
            dur = (l["end"] - l["start"]) / FPS
            if dur < 1.5:
                warnings.append(f"line {lid} only {dur:.2f}s")
            rate = clean_len(l["text"]) / max(dur, 0.01)
            if rate > ALLOWED_RATE:
                warnings.append(f"line {lid} {rate:.1f} chars/s: {l['text']}")
        # captions must not overlap inside a shot
        for a, b in zip(shot["lines"], shot["lines"][1:]):
            if line_by_id[a]["end"] >= line_by_id[b]["start"]:
                problems.append(f"caption overlap {a}->{b} in {shot['id']}")
    for a, b in zip(lines, lines[1:]):
        if a["end"] > b["start"]:
            problems.append(f"caption overlap across shots: line {a['i']} -> {b['i']}")
    if used != set(line_by_id):
        problems.append(f"unused lines {sorted(set(line_by_id) - used)}")

    # All shots must have a scene case in Film.tsx.
    film = open(os.path.join(ROOT, "remotion", "src", "Film.tsx"), encoding="utf-8").read()
    for shot in shots:
        if f'case "{shot["id"]}"' not in film:
            problems.append(f"no scene case for {shot['id']}")

    ts = open(os.path.join(ROOT, "remotion", "src", "data", "timeline.ts"), encoding="utf-8").read()
    if f"export const FILM_FRAMES = {FILM_FRAMES};" not in ts:
        problems.append(f"timeline.ts FILM_FRAMES not {FILM_FRAMES}")

    target_s = float(tl["duration_s"])
    if audio_mode == "none":
        print("\naudio: none (mix/bed check skipped)")
    elif audio_mode == "remotion":
        mix = os.path.join(ROOT, audio.get("mix", DEFAULT_MIX))
        if not os.path.exists(mix):
            problems.append(f"{audio.get('mix', DEFAULT_MIX)} missing "
                            f"(audio.mode=remotion)")
        else:
            problem = duration_problem(mix, target_s, "mix")
            if problem:
                problems.append(problem)
            else:
                print(f"\naudio: remotion mix {audio.get('mix', DEFAULT_MIX)} duration OK")
    elif audio_mode == "post_mux":
        bed = os.path.join(ROOT, audio.get("bed", DEFAULT_BED))
        if not os.path.exists(bed):
            warnings.append(f"{audio.get('bed', DEFAULT_BED)} missing "
                            f"(audio.mode=post_mux); duration check skipped")
        else:
            problem = duration_problem(bed, target_s, "bed")
            if problem:
                problems.append(problem)
            else:
                print(f"\naudio: post_mux bed {audio.get('bed', DEFAULT_BED)} duration OK")

    on_screen = sum(l["end"] - l["start"] for l in lines)
    chars = sum(clean_len(l["text"]) for l in lines)
    holds = [(l["end"] - l["start"]) / FPS for l in lines]
    wordless = [s["id"] for s in shots if not s["lines"]]
    print(f"\npacing: {len(shots)} cuts / {len(lines)} lines / {chars} chars "
          f"({chars / (FILM_FRAMES / FPS):.1f} chars per second of film)")
    print(f"  captions on screen {on_screen / FPS:.1f}s of {FILM_FRAMES / FPS:.0f}s "
          f"({100.0 * on_screen / FILM_FRAMES:.0f}%), hold avg {sum(holds) / len(holds):.1f}s, "
          f"min {min(holds):.1f}s, max {max(holds):.1f}s")
    print(f"  reading rate avg {chars / on_screen * FPS:.1f} chars/s; "
          f"wordless shots: {', '.join(wordless) if wordless else 'none'}")

    print(f"\nshots={len(shots)} lines={len(lines)} filmFrames={FILM_FRAMES} "
          f"cut_grid={cut_grid} audio.mode={audio_mode}")
    if warnings:
        print("warnings:")
        for w in warnings:
            print("  -", w)
    if problems:
        print("PROBLEMS:")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    print("AUDIT OK: 0 problems")


if __name__ == "__main__":
    main()

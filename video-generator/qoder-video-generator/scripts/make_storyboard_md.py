# -*- coding: utf-8 -*-
"""Generate STORYBOARD.md from spec/shotlist.json + spec/beat_timeline.json.

Why generated: a hand-written storyboard is a second source of truth, and the
second source is the one that goes stale — this project has already been bitten
by STATUS.md quoting numbers nobody re-measured. `BRIEF.md` and `frame.md` are
hand-written on purpose (intent and look are not derivable); the frame table is.

The keys the hyperframes parser does not know (`bars`, `start_frame`, `tech`,
`camera_move`, `source_note`, `ui_rects`) are kept verbatim under the frame's
`extra` — that is the documented extension point
(`hyperframes/references/storyboard-format.md`), not an invention of ours.

Frontmatter comes from BRIEF.md (message / arc / audience / aspect) and from
the timeline (duration). Nothing about a particular film is hard-coded here.

Usage: PROJECT=<dir> python -X utf8 scripts/make_storyboard_md.py
"""
import io
import json
import os

ROOT = os.path.abspath(os.environ.get("PROJECT") or os.getcwd())
TOOLS = os.path.dirname(os.path.abspath(__file__))


def brief_meta():
    """Parse the YAML frontmatter of BRIEF.md without a yaml dependency.

    Only flat `key: value` lines are read; nested structures are ignored. The
    brief stays the human's document - it is read, never rewritten.
    """
    path = os.path.join(ROOT, "BRIEF.md")
    meta = {}
    if not os.path.exists(path):
        return meta
    lines = io.open(path, encoding="utf-8").read().splitlines()
    if not lines or lines[0].strip() != "---":
        return meta
    for ln in lines[1:]:
        if ln.strip() == "---":
            break
        if ":" in ln and not ln.startswith(" "):
            k, v = ln.split(":", 1)
            meta[k.strip()] = v.strip().strip('"')
    return meta


def main():
    sl = json.load(io.open(os.path.join(ROOT, "spec", "shotlist.json"), encoding="utf-8"))
    tl = json.load(io.open(os.path.join(ROOT, "spec", "beat_timeline.json"), encoding="utf-8"))
    lines_by_shot = {}
    for L in tl["lines"]:
        lines_by_shot.setdefault(L.get("shot"), []).append(L["text"])

    meta = brief_meta()
    fps = float(tl.get("fps", 30))
    dur_s = float(tl["film_frames"]) / fps
    tool_path = os.path.join(TOOLS, "make_storyboard_md.py")
    try:
        tool_rel = os.path.relpath(tool_path, ROOT)
    except ValueError:
        # Windows cannot express a relative path between different drives.
        tool_rel = tool_path
    tool_rel = tool_rel.replace("\\", "/")
    out = [
        "---",
        "format: %s" % meta.get("aspect", "1080x1920"),
        "duration: %.1fs" % dur_s,
        'message: "%s"' % meta.get("message", sl.get("title", "")),
        'arc: "%s"' % meta.get("arc", ""),
        "audience: %s" % meta.get("audience", ""),
        "mode: %s" % ("collaborative" if meta.get("flow") == "collaborative" else "auto"),
        "---",
        "",
        "# 分镜 · 《%s》" % sl.get("title", "未命名"),
        "",
        "本文件由 `%s` 从 `spec/shotlist.json` 生成，**不要手改**；" % tool_rel,
        "改分镜改 shotlist（它是机器契约），改完重跑本脚本。",
        "按 `hyperframes/references/review-loop.md` 的约定：`outline` 已定，",
        "`built` = 画面已建，`animated` = 动效与配光已过闸门。",
        "",
    ]

    for s in sl["shots"]:
        sid = s["id"]
        rec = tl_shot(tl, sid)
        dur = (rec["dur"] if rec else s.get("dur_s", 4.27) * fps)
        narr = (s.get("narration") or "").strip()
        title = (s.get("visual") or sid).split("（")[0].split("。")[0][:26]
        out.append("## Frame %s — %s" % (n_of(tl, sid), title))
        out.append("- status: animated")
        out.append("- duration: %ds" % max(1, int(round(dur / fps))))
        out.append("- transition_in: cut")
        out.append("- scene: %s" % title)
        out.append("- voiceover: %s" % (narr.replace("\n", " / ") if narr else "（无字幕镜头）"))
        out.append("- poster: %d" % (dur * 0.72))
        out.append("- bars: %s" % s.get("bars"))
        out.append("- start_frame: %s" % (rec["start"] if rec else "-"))
        out.append("- tech: %s" % s.get("tech"))
        out.append("- camera_move: %s" % s.get("camera_move"))
        mv = s.get("motion") or {}
        if mv:
            out.append("- motion: %s — %s" % (mv.get("kind", "?"), mv.get("intent", "")))
        out.append("- ui_rects: %s" % ",".join(s.get("ui_rects") or []))
        out.append("")
        out.append(s.get("visual") or "")
        out.append("")
        if s.get("source_note"):
            out.append("> 口径：%s" % s["source_note"])
            out.append("")

    io.open(os.path.join(ROOT, "STORYBOARD.md"), "w", encoding="utf-8", newline="\n").write(
        "\n".join(out) + "\n")
    print("STORYBOARD.md: %d frames, %.1fs" % (len(sl["shots"]), dur_s))


def tl_shot(tl, sid):
    for s in tl["shots"]:
        if s["id"] == sid:
            return s
    return None


def n_of(tl, sid):
    for i, s in enumerate(tl["shots"], 1):
        if s["id"] == sid:
            return i
    return "?"


if __name__ == "__main__":
    main()

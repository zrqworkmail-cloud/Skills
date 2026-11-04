#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Scrub machine-local paths and personal file names from docs before publishing.

Why: the retrospective docs (build/STATUS.md, build/review_log.md, BRIEF.md) are
written for one machine and quote real paths - the project folder, the user's own
music file, the Windows profile. Those are exactly the things that should not go
into a public repo, while the numbers, the lessons and the tool names must stay
byte-identical (a doc whose measurements got reworded is worthless).

So this is a pure substitution pass over an ordered table. It never rewrites
prose. Originals live in build/private/ (gitignored); run it on the tracked copy.

Usage:
  python scripts/redact.py build/STATUS.md build/review_log.md BRIEF.md
  python scripts/redact.py --check <files...>      # report leftovers, change nothing
"""
import io
import os
import re
import sys

# Build the rules from THIS machine at runtime. Baking the literal profile name
# into the scrubber would publish the very thing it is meant to hide.
HOME = os.path.expanduser("~")
USER_WIN = HOME.replace("/", "\\")
USER_FWD = HOME.replace("\\", "/")
PROJECT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PARENT = os.path.dirname(PROJECT)


def _variants(path):
    """Same path as it can appear: forward slashes, backslashes, JSON-escaped."""
    fwd = path.replace("\\", "/")
    win = path.replace("/", "\\")
    return [re.escape(v) for v in (fwd, win, "\\\\".join(fwd.split("/")))]


def _user_variants():
    out = [re.escape(USER_FWD), re.escape(USER_WIN)]
    m = re.match(r"^([A-Za-z]):/", USER_FWD)
    if m:  # git-bash: /<drive>/Users/<name> style paths (pattern example)
        rest = USER_FWD[3:]
        out += [re.escape("/" + m.group(1).lower() + "/" + rest),
                re.escape(m.group(1).lower() + "/" + rest)]
    return out


# Longest-first: the project path contains the drive letter that a shorter rule
# would otherwise eat.
RULES = []
for v in _variants(PARENT):
    RULES.append((v, "<仓库父目录>"))
for v in _variants(PROJECT):
    RULES.append((v, "<项目目录>"))
RULES += [
    (r"(?:[A-Za-z]:[/\\]|/[a-z]/)[^\s\"'`]*[/\\]Music[/\\][^\s\"'`]+\.(?:mp4|wav|mp3|m4a)",
     "<用户自备的 BGM 文件>"),
]
for v in _variants(os.path.join(HOME, "Documents", "Codex", ".agents", "skills")):
    RULES.append((v, "<CLI 侧技能目录>"))
for v in _variants(os.path.join(HOME, ".qoder", "skills")):
    RULES.append((v, "<用户级技能目录>"))
for v in _user_variants():
    RULES.append((v, "<用户目录>"))
RULES.append((r"~/Documents/Codex", "<CLI 工作目录>"))
COMPILED = [(re.compile(p), r) for p, r in RULES]

# Anything still looking like a personal absolute path after the pass.
_LEAK = [r"[CDcd]:[/\\\\][Uu]sers", re.escape(os.path.basename(HOME))]
LEFTOVER = re.compile("|".join(_LEAK))


def main(argv):
    check = argv and argv[0] == "--check"
    files = argv[1:] if check else argv
    if not files:
        print(__doc__)
        return 2
    bad = 0
    for path in files:
        text = io.open(path, encoding="utf-8", newline="").read()
        hits = 0
        out = text
        for rx, rep in COMPILED:
            out, n = rx.subn(rep, out)
            hits += n
        left = [ln for ln in out.splitlines() if LEFTOVER.search(ln)]
        if check:
            if left:
                bad += 1
                print(f"LEFTOVER {path}:")
                for ln in left[:5]:
                    print("   " + ln.strip()[:140])
        elif hits:
            nl = "\n" if "\n" in out else "\r\n"
            io.open(path, "w", encoding="utf-8", newline="").write(out)
            print(f"{path}: {hits} substitution(s)" + (f", {len(left)} leftover line(s)!" if left else ""))
        else:
            print(f"{path}: nothing to scrub")
    return 1 if (check and bad) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

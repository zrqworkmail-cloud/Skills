# -*- coding: utf-8 -*-
"""What words are actually printed inside each scene file (for copy review)."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "remotion", "src", "scenes")

FILES = sys.argv[1:] or sorted(f for f in os.listdir(SRC) if f.endswith(".tsx"))
out = []
pat_jsx = re.compile(r">([^<>{}\n]{2,70})<")
pat_dq = re.compile(r'"([^"\n]*[\u4e00-\u9fff][^"\n]*)"')
pat_label = re.compile(r'(label|status|text|title|cn|foot|note|cap)\s*[:=]\s*"([^"\n]{2,70})"')
# Backtick copy is on screen too (the sheet notes are template literals) and a
# block comment is not. Without these two rules the dumper listed the phrase
# "约 36,000" as burned-in text when it only ever appeared in a code comment,
# and missed the line that actually renders.
pat_tpl = re.compile(r"`([^`\n]*[\u4e00-\u9fff][^`\n]*)`")
pat_comment = re.compile(r"/\*.*?\*/|\n\s*//[^\n]*", re.S)

for fn in FILES:
    p = os.path.join(SRC, fn)
    if not os.path.exists(p):
        continue
    t = open(p, encoding="utf-8").read()
    # blank out comments, keeping line numbers stable
    t = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), t, flags=re.S)
    t = re.sub(r"\n\s*//[^\n]*", "", t)
    seen = []
    for m in (list(pat_jsx.findall(t)) + list(pat_dq.findall(t))
              + list(pat_tpl.findall(t)) + [b for _, b in pat_label.findall(t)]):
        s = m.strip()
        if not s or s in seen:
            continue
        if s.startswith(("rgba", "#", "linear", "radial", "./", "assets", "stills", "wan", "url")):
            continue
        if re.fullmatch(r"[\w\s./:%#-]+", s) and not re.search(r"[\u4e00-\u9fff]", s):
            continue
        seen.append(s)
    out.append("### " + fn)
    out.extend("    " + s for s in seen)

open(os.path.join(ROOT, "build", "visible_now.txt"), "w", encoding="utf-8").write("\n".join(out))
print("wrote", len(out), "lines")

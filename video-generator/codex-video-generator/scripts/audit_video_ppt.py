"""Read-only structural audit of a full-slide, manually advanced video PPTX."""
import argparse
import hashlib
import json
import posixpath
import re
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"p": "http://schemas.openxmlformats.org/presentationml/2006/main",
      "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}

def audit(path, clips=None):
    errors = []
    records = []
    with zipfile.ZipFile(path) as z:
        presentation = ET.fromstring(z.read("ppt/presentation.xml"))
        size = presentation.find("p:sldSz", NS)
        extent = (size.get("cx"), size.get("cy"))
        slides = sorted((n for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
                        key=lambda n: int(re.search(r"slide(\d+)", n).group(1)))
        used_media = []
        for name in slides:
            root = ET.fromstring(z.read(name))
            relname = posixpath.join(posixpath.dirname(name), "_rels", posixpath.basename(name) + ".rels")
            rels = {r.get("Id"): r for r in ET.fromstring(z.read(relname))}
            videos = root.findall(".//a:videoFile", NS)
            if len(videos) != 1:
                errors.append(f"{name}: expected one video, found {len(videos)}")
            for video in videos:
                rel = rels[video.get("{" + NS["r"] + "}link")]
                if rel.get("TargetMode") == "External":
                    errors.append(f"{name}: external video")
                    continue
                target = posixpath.normpath(posixpath.join(posixpath.dirname(name), rel.get("Target")))
                used_media.append(target)
            pics = root.findall(".//p:pic", NS)
            video_pics = [p for p in pics if p.find(".//a:videoFile", NS) is not None]
            for pic in video_pics:
                offset = pic.find("p:spPr/a:xfrm/a:off", NS)
                ext = pic.find("p:spPr/a:xfrm/a:ext", NS)
                if offset is None or ext is None or (offset.get("x"), offset.get("y")) != ("0", "0") or (ext.get("cx"), ext.get("cy")) != extent:
                    errors.append(f"{name}: video does not fill slide")
            types = [n.get("nodeType") for n in root.findall(".//p:cTn", NS)]
            main = next((n for n in root.findall(".//p:cTn", NS) if n.get("nodeType") == "mainSeq"), None)
            autoplay = main is not None and any(
                n.get("nodeType") == "withEffect" and any(
                    c.get("cmd", "").startswith("playFrom") for c in n.findall(".//p:cmd", NS))
                for n in main.findall(".//p:cTn", NS))
            if not autoplay:
                errors.append(f"{name}: playback trigger requires review")
            transition = root.find("p:transition", NS)
            if transition is not None and (transition.get("advTm") is not None or transition.get("advClick") == "0"):
                errors.append(f"{name}: slide is not manually advanced")
            records.append({"slide": name, "videos": len(videos), "nodeTypes": types})
        media_hashes = Counter(hashlib.sha256(z.read(n)).hexdigest() for n in used_media)
        if clips:
            local = Counter(hashlib.sha256(p.read_bytes()).hexdigest() for p in Path(clips).glob("*.mp4"))
            if media_hashes != local:
                errors.append("Embedded media does not match supplied clips (including multiplicity)")
    return {"status": "passed" if not errors else "failed", "slides": len(records),
            "embeddedVideoOccurrences": len(used_media), "errors": errors, "records": records}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pptx", type=Path)
    parser.add_argument("--clips", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = audit(args.pptx, args.clips)
    if args.output:
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "records"}, ensure_ascii=False))
    raise SystemExit(bool(result["errors"]))

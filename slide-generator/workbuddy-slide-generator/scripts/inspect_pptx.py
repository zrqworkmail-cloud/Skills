#!/usr/bin/env python3
"""Read-only PPTX inventory. Does not render, resolve theme fonts, or fetch URLs."""

import argparse
import json
import posixpath
import sys
import xml.etree.ElementTree as ET
from zipfile import BadZipFile, ZipFile


NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "c": "http://schemas.openxmlformats.org/drawingml/2006/chart",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def resolve_part(source, target):
    part = posixpath.normpath(posixpath.join(posixpath.dirname(source), target))
    if part.startswith("/"):
        part = part[1:]
    if part == ".." or part.startswith("../"):
        raise ValueError("Package relationship escapes the package root")
    return part


def inspect_pptx(path):
    with ZipFile(path) as package:
        names = set(package.namelist())
        root = ET.fromstring(package.read("ppt/presentation.xml"))
        rels = ET.fromstring(package.read("ppt/_rels/presentation.xml.rels"))
        targets = {
            rel.get("Id"): resolve_part("ppt/presentation.xml", rel.attrib["Target"])
            for rel in rels
            if rel.get("TargetMode") != "External"
        }
        size = root.find("p:sldSz", NS)
        if size is None:
            raise ValueError("Presentation has no slide dimensions")
        slides = []
        for index, slide_id in enumerate(root.findall("p:sldIdLst/p:sldId", NS), 1):
            part = targets[slide_id.attrib["{" + NS["r"] + "}id"]]
            slide = ET.fromstring(package.read(part))
            slides.append({
                "position": index,
                "part": part,
                "text_shape_count": sum(
                    bool(shape.findall(".//a:t", NS))
                    for shape in slide.findall(".//p:sp", NS)
                ),
                "picture_count": len(slide.findall(".//p:pic", NS)),
                "native_chart_count": len(slide.findall(".//c:chart", NS)),
                "table_count": len(slide.findall(".//a:tbl", NS)),
                "fields": [
                    {"type": field.get("type"), "cached_text": "".join(field.itertext())}
                    for field in slide.findall(".//a:fld", NS)
                ],
            })
        fonts = set()
        external_count = 0
        for name in names:
            if name.endswith(".xml") and name.startswith("ppt/"):
                for element in ET.fromstring(package.read(name)).iter():
                    if element.tag in {"{" + NS["a"] + "}" + tag for tag in ("latin", "ea", "cs")}:
                        if element.get("typeface"):
                            fonts.add(element.get("typeface"))
            elif name.endswith(".rels"):
                external_count += sum(
                    rel.get("TargetMode") == "External"
                    for rel in ET.fromstring(package.read(name))
                )
        return {
            "canvas_emu": {"width": int(size.attrib["cx"]), "height": int(size.attrib["cy"])},
            "slide_count": len(slides),
            "master_count": len(root.findall("p:sldMasterIdLst/p:sldMasterId", NS)),
            "embedded_workbook_count": sum(
                name.startswith("ppt/embeddings/") and name.endswith(".xlsx") for name in names
            ),
            "font_records_not_resolved": sorted(fonts),
            "external_relationship_count": external_count,
            "slides": slides,
            "limits": "Inventory only; no rendering, theme resolution, full schema validation, or Office editing test.",
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pptx", help="Existing presentation; input is never modified")
    args = parser.parse_args()
    try:
        result = inspect_pptx(args.pptx)
    except (OSError, BadZipFile, KeyError, ET.ParseError, ValueError) as error:
        print(f"PPTX inspection failed: {error}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# -*- coding: utf-8 -*-
"""Submit a Wan2.2 4-step I2V job to local ComfyUI and collect the mp4."""
import argparse
import json
import os
import shutil
import time
import urllib.request

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMFY = "http://127.0.0.1:8188"
TEMPLATE = os.environ.get("COMFY_WORKFLOW_TEMPLATE", "workflow.api.json")
OUT_DIR = os.environ.get("COMFY_OUTPUT_DIR", "output")


def upload(image_path):
    with open(image_path, "rb") as f:
        r = requests.post(f"{COMFY}/upload/image", files={"image": f}, data={"overwrite": "true"}, timeout=60)
    r.raise_for_status()
    return r.json()["name"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--seed", type=int, default=20261020)
    ap.add_argument("--prefix", default="weather/wan22-test")
    ap.add_argument("--name", default="wan-test")
    ap.add_argument("--width", type=int, default=720)
    ap.add_argument("--height", type=int, default=1280)
    ap.add_argument("--length", type=int, default=73)
    args = ap.parse_args()

    wf = json.load(open(TEMPLATE, encoding="utf-8"))
    wf["5"]["inputs"]["text"] = args.prompt
    wf["7"]["inputs"]["image"] = upload(args.image)
    wf["8"]["inputs"]["width"] = args.width
    wf["8"]["inputs"]["height"] = args.height
    wf["8"]["inputs"]["length"] = args.length
    wf["11"]["inputs"]["noise_seed"] = args.seed
    wf["12"]["inputs"]["noise_seed"] = args.seed
    wf["15"]["inputs"]["filename_prefix"] = args.prefix

    t0 = time.time()
    r = requests.post(f"{COMFY}/prompt", json={"prompt": wf}, timeout=30)
    r.raise_for_status()
    pid = r.json()["prompt_id"]
    print("prompt_id", pid, "uploaded", wf["7"]["inputs"]["image"], flush=True)

    while True:
        time.sleep(5)
        h = requests.get(f"{COMFY}/history/{pid}", timeout=30).json()
        if pid in h:
            entry = h[pid]
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(json.dumps(status, ensure_ascii=False)[:2000])
            outs = entry.get("outputs", {})
            files = []
            for node in outs.values():
                for key in ("images", "gifs", "videos"):
                    for item in node.get(key, []):
                        files.append(item)
            if files:
                item = files[-1]
                src = os.path.join(OUT_DIR, item.get("subfolder", ""), item["filename"])
                dst_dir = os.path.join(ROOT, "assets", "wan")
                os.makedirs(dst_dir, exist_ok=True)
                dst = os.path.join(dst_dir, args.name + os.path.splitext(item["filename"])[1])
                shutil.copy2(src, dst)
                print("DONE", dst, "elapsed", round(time.time() - t0, 1), "s", flush=True)
                return
        print("running", int(time.time() - t0), "s", flush=True)


if __name__ == "__main__":
    main()

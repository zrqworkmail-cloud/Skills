#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""公开仓快照同步（GitHub Git Data API 增量通道）。

为什么需要这条通道：
  源仓是纯本地源（origin 已移除），对外同步要走公开仓快照
  （`git archive HEAD | tar -x -C <公开仓>/<领域>-generator/<平台>-<领域>-generator`）。
  快照的标准做法是 clone 公开仓再覆盖目录，但公开仓含几十 MB 的不可再生素材
  （BGM 母版等），clone 常常在传输中断（`schannel: server closed abruptly` / `early EOF`），
  一次克隆可能耗十几分钟且最终失败。

  本脚本改用 GitHub Git Data API 做**增量**提交：
  只上传发生变化的 blob，不下载整仓，与「快照」语义等价但不受大文件拖累。

流程：
  取远端 ref → 取 base_tree → 比对远端已有 blob →
  逐个变化文件建 blob → 建新 tree（base_tree=远端树，只覆盖变化项）→
  建 commit → PATCH ref（fast-forward，非 force）

用法：
  python scripts/push_snapshot.py --repo owner/name --subdir <子目录> [--base <对比基准>]

环境要求：`gh` CLI 已认证（`gh auth login`），且已安装 git。
身份信息不走脚本参数，避免写死作者姓名/邮箱。
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(HERE))


def gh_api(method, path, body=None):
    """调 GitHub API（gh CLI 负责认证）。"""
    cmd = ["gh", "api", "-X", method, path]
    if body is not None:
        cmd += ["--input", "-"]
    p = subprocess.run(cmd, input=json.dumps(body) if body is not None else None,
                       capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"{method} {path} 失败：{(p.stderr or p.stdout)[:400]}")
    return json.loads(p.stdout) if p.stdout.strip() else None


def retry(fn, n=4, label=""):
    """网络抖动重试——GitHub API 偶发 EOF 很常见，不是通道坏了。"""
    last = None
    for i in range(n):
        try:
            return fn()
        except Exception as e:
            last = e
            print(f"  ! 重试 {i+1}/{n} {label}：{str(e)[:160]}", flush=True)
            time.sleep(3 * (i + 1))
    raise last


def git(*args, binary=False):
    cmd = ["git", "-C", REPO_ROOT, "-c", "core.quotepath=false"] + list(args)
    p = subprocess.run(cmd, capture_output=True, text=not binary)
    if p.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} 失败：{(p.stderr or p.stdout)[:400]}")
    return p.stdout if binary else p.stdout


def changed_files(base):
    """base 为空时取 HEAD~1..HEAD；否则取 base..HEAD。"""
    rng = f"{base}..HEAD" if base else "HEAD~1..HEAD"
    raw = git("diff", "--name-status", rng)
    out = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        out.append((parts[0][0], parts[-1]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True, help="公开仓 owner/name")
    ap.add_argument("--subdir", required=True, help="公开仓内的目标子目录")
    ap.add_argument("--base", default="", help="对比基准 commit（默认与上一次提交比）")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    changes = changed_files(a.base)
    print(f"增量文件 {len(changes)} 个")

    ref = retry(lambda: gh_api("GET", f"repos/{a.repo}/git/ref/heads/main"), label="ref")
    head_sha = ref["object"]["sha"]
    commit = retry(lambda: gh_api("GET", f"repos/{a.repo}/git/commits/{head_sha}"), label="commit")
    base_tree = commit["tree"]["sha"]
    print(f"远端 HEAD {head_sha[:10]}  base_tree {base_tree[:10]}")

    tree = retry(lambda: gh_api("GET", f"repos/{a.repo}/git/trees/{base_tree}?recursive=1"), label="tree")
    remote = {}
    for e in tree.get("tree", []):
        if e["type"] == "blob" and e["path"].startswith(a.subdir + "/"):
            remote[e["path"][len(a.subdir) + 1:]] = e["sha"]

    entries = []
    for status, path in changes:
        full = os.path.join(REPO_ROOT, path.replace("/", os.sep))
        if not os.path.isfile(full):
            print(f"  跳过（工作区不存在）{path}")
            continue
        # 必须用 git cat-file 取**规范化后**的 blob 字节：
        # 工作区字节可能带 CRLF，直接上传会得到与 git 对象不同的 blob sha。
        blob_bytes = git("cat-file", "blob", f"HEAD:{path}", binary=True)
        sha = git("rev-parse", f"HEAD:{path}").strip()
        if remote.get(path) == sha:
            print(f"  已一致 {path}")
            continue
        blob = retry(lambda d=blob_bytes: gh_api("POST", f"repos/{a.repo}/git/blobs", {
            "content": base64.b64encode(d).decode(), "encoding": "base64",
        }), label=f"blob {path}")
        if blob["sha"] != sha:
            raise RuntimeError(f"blob sha 不一致 {path}: api={blob['sha']} git={sha}")
        entries.append({"path": f"{a.subdir}/{path}", "mode": "100644",
                        "type": "blob", "sha": sha})
        print(f"  ✔ {status} {path}")

    if not entries:
        print("无实际变化，跳过提交")
        return 0
    if a.dry_run:
        print("（--dry-run，未提交）")
        return 0

    new_tree = retry(lambda: gh_api("POST", f"repos/{a.repo}/git/trees", {
        "base_tree": base_tree, "tree": entries,
    }), label="tree")
    new_commit = retry(lambda: gh_api("POST", f"repos/{a.repo}/git/commits", {
        "message": "chore(skill): 同步 workbuddy-video-workflow 快照",
        "tree": new_tree["sha"], "parents": [head_sha],
    }), label="commit")
    new_ref = retry(lambda: gh_api("PATCH", f"repos/{a.repo}/git/refs/heads/main", {
        "sha": new_commit["sha"], "force": False,
    }), label="ref")
    print(f"✔ 推送完成 {head_sha[:10]}..{new_ref['object']['sha'][:10]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

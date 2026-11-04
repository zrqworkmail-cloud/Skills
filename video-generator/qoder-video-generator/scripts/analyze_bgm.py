# -*- coding: utf-8 -*-
"""Measure a supplied track's tempo, beat grid and bar-level energy.

Outputs build/bgm_analysis.json so a music-locked cut can place every shot
boundary on a bar line instead of a narration pause. The track is an input:
the creator's own music, never a generated substitute.

Usage: python -X utf8 scripts/analyze_bgm.py [--bgm <track>] [--out build/bgm_analysis.json]
"""
import argparse
import json
import os
import shutil
import subprocess
import tempfile

import librosa
import numpy as np

ROOT = os.path.abspath(os.environ.get("PROJECT") or os.getcwd())


def _ffmpeg_path():
    """Windows python cannot run a Git-Bash /<drive>/... path; prefer a native interpreter."""
    for cand in (os.environ.get("FFMPEG"), shutil.which("ffmpeg"),
                 "ffmpeg"):
        if cand and os.path.exists(cand):
            return cand
    return None


def load_audio(src):
    """librosa alone cannot decode m4a/mp3 on every install; fall back to ffmpeg."""
    try:
        return librosa.load(src, sr=44100, mono=True)
    except Exception as exc:
        ff = _ffmpeg_path()
        if not ff:
            raise SystemExit(
                f"librosa 无法解码 {os.path.basename(src)}，且找不到 ffmpeg；"
                f"用 FFMPEG=<path> 指定。原始错误: {exc}"
            )
        tmpdir = tempfile.mkdtemp(prefix="bgm_")
        wav = os.path.join(tmpdir, "decoded.wav")
        try:
            subprocess.run(
                [ff, "-v", "error", "-y", "-i", src, "-vn",
                 "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", wav],
                check=True,
            )
            print("librosa 直接解码失败，已用 ffmpeg 转码为临时 WAV 再分析")
            return librosa.load(wav, sr=44100, mono=True)
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bgm", default=os.path.join(ROOT, "assets", "audio", "bgm_raw.wav"))
    ap.add_argument("--out", default=os.path.join(ROOT, "build", "bgm_analysis.json"))
    args = ap.parse_args()
    SRC = args.bgm
    OUT = args.out
    y, sr = load_audio(SRC)
    dur = len(y) / sr

    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
    tempo, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=sr, hop_length=512, trim=False
    )
    tempo = float(np.atleast_1d(tempo)[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=512)
    beats = [round(float(t), 4) for t in beat_times]

    # Candidate downbeat phase: the beat phase whose bars carry the strongest
    # onset weight. Purely a heuristic, reported so a human can sanity check.
    strengths = librosa.util.sync(onset_env, beat_frames, aggregate=np.mean)
    strengths = np.atleast_1d(strengths)
    phases = {}
    for phase in range(4):
        idx = np.arange(phase, len(strengths), 4)
        phases[phase] = float(strengths[idx].mean()) if len(idx) else 0.0
    downbeat_phase = max(phases, key=phases.get)
    downbeats = [beats[i] for i in range(downbeat_phase, len(beats), 4)]

    # Bar energy, using the chosen phase. Short final bar is reported as-is.
    rms = librosa.feature.rms(y=y, hop_length=512)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)
    bars = []
    for i, t in enumerate(downbeats):
        end = downbeats[i + 1] if i + 1 < len(downbeats) else dur
        mask = (times >= t) & (times < end)
        bars.append({
            "i": i,
            "start": round(t, 3),
            "end_s": round(end, 3),
            "rms_db": round(float(20 * np.log10(max(rms[mask].mean(), 1e-9))), 1) if mask.any() else -120.0,
        })

    # Coarse sections: group consecutive bars whose RMS differs by < 2.5 dB.
    sections = []
    for bar in bars:
        if sections and abs(bar["rms_db"] - sections[-1]["rms_db"]) < 2.5:
            sections[-1]["end_s"] = bar["end_s"]
            sections[-1]["bars"] += 1
            sections[-1]["rms_db"] = round(
                (sections[-1]["rms_db"] * (sections[-1]["bars"] - 1) + bar["rms_db"])
                / sections[-1]["bars"], 1
            )
        else:
            sections.append({
                "start": bar["start"],
                "end_s": bar["end_s"],
                "bars": 1,
                "rms_db": bar["rms_db"],
            })

    # Never persist a personal absolute path in a JSON that may be shared; keep
    # the basename and a project-relative path when the track lives under ROOT.
    try:
        rel = os.path.relpath(SRC, ROOT)
    except ValueError:
        rel = os.path.basename(SRC)
    if rel.startswith(".."):
        rel = os.path.basename(SRC)
    meta = {
        "source": rel.replace("\\", "/"),
        "source_name": os.path.basename(SRC),
        "duration_s": round(dur, 3),
        "sample_rate_hz": sr,
        "tempo_bpm": round(tempo, 3),
        "beat_count": len(beats),
        "bar_seconds": round(60.0 / tempo * 4, 4),
        "duration_in_bars": round(dur / (60.0 / tempo * 4), 3),
        "downbeat_phase": downbeat_phase,
        "phase_onset_mean": {str(k): round(v, 4) for k, v in phases.items()},
        "downbeats": [round(float(t), 4) for t in downbeats],
        "beats": beats,
        "bars": bars,
        "sections": sections,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(meta, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"duration {dur:.3f}s  tempo {tempo:.2f} BPM  beats {len(beats)}  bars {len(downbeats)}")
    print(f"bar {60.0 / tempo * 4:.3f}s  duration_in_bars {meta['duration_in_bars']}")
    print(f"downbeat phase {downbeat_phase}  onset means {meta['phase_onset_mean']}")
    print("sections:")
    for s in sections:
        print(f"  {s['start']:7.2f}-{s['end_s']:7.2f}  {s['bars']:3d} bars  {s['rms_db']:5.1f} dB")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()

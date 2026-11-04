"""Offline storyboard regression tests; fixtures never touch existing projects.

The cross-drive case runs the real generator from its installed drive against
an OS temporary project. It explicitly skips when a second drive is unavailable.
"""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().with_name("make_storyboard_md.py")


class StoryboardTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="storyboard test ")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.project = self.root / "project with spaces"
        (self.project / "spec").mkdir(parents=True)
        self.caller = self.root / "different caller"
        self.caller.mkdir()
        shotlist = {
            "title": "跨项目分镜", "fps": 30,
            "shots": [
                {"id": "s00", "dur_s": 4.2, "narration": "观察两条轨迹",
                 "visual": "两条轨迹从重合到分叉", "source_note": "演示数据",
                 "motion": {"kind": "demo", "intent": "比较初态与结果"}},
                {"id": "s01", "dur_s": 5.0, "narration": "比较分叉结果",
                 "visual": "保留结果供比较"},
            ],
        }
        timeline = {
            "fps": 30, "duration_s": 9.2, "film_frames": 276,
            "shots": [
                {"id": "s00", "start": 0, "dur": 126, "lines": [1]},
                {"id": "s01", "start": 126, "dur": 150, "lines": [2]},
            ],
            "lines": [
                {"i": 1, "shot": "s00", "text": "观察两条轨迹", "start": 6, "end": 120},
                {"i": 2, "shot": "s01", "text": "比较分叉结果", "start": 132, "end": 270},
            ],
        }
        for name, data in (("shotlist.json", shotlist), ("beat_timeline.json", timeline)):
            (self.project / "spec" / name).write_text(
                json.dumps(data, ensure_ascii=False), encoding="utf-8")
        self.inputs = {path: path.read_bytes() for path in (self.project / "spec").iterdir()}

    def generate(self, script):
        env = os.environ.copy()
        env["PROJECT"] = self.project.as_posix()
        result = subprocess.run(
            [sys.executable, "-B", "-X", "utf8", str(script)],
            cwd=self.caller, env=env, capture_output=True, text=True,
            encoding="utf-8", timeout=10,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(result.stderr, "")
        self.assertIn("2 frames, 9.2s", result.stdout)
        self.assertFalse((self.caller / "STORYBOARD.md").exists())
        output = (self.project / "STORYBOARD.md").read_text(encoding="utf-8")
        self.assertIn("duration: 9.2s", output)
        self.assertEqual(output.count("## Frame "), 2)
        for text in ("两条轨迹从重合到分叉", "比较初态与结果", "演示数据", "观察两条轨迹"):
            self.assertIn(text, output)
        for path, before in self.inputs.items():
            self.assertEqual(path.read_bytes(), before, f"input was rewritten: {path}")
        return output

    def test_same_drive_keeps_relative_tool_reference_and_stable_output(self):
        tools = self.root / "shared tools"
        tools.mkdir()
        script = tools / SCRIPT.name
        shutil.copyfile(SCRIPT, script)
        first = self.generate(script)
        self.assertIn("`../shared scripts/make_storyboard_md.py`", first)
        self.assertEqual(self.generate(script), first)

    @unittest.skipUnless(os.name == "nt", "Windows drive-letter behavior")
    def test_cross_drive_project_generates_with_absolute_tool_reference(self):
        if SCRIPT.drive.casefold() == self.project.drive.casefold():
            self.skipTest("Put the generator and OS temporary directory on different drives")
        output = self.generate(SCRIPT)
        self.assertIn(f"`{SCRIPT.as_posix()}`", output)
        self.assertEqual(self.generate(SCRIPT), output)


if __name__ == "__main__":
    unittest.main(verbosity=2)

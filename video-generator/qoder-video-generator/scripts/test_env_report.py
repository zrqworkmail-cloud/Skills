"""Offline regression tests for the real env_report.sh (stdlib only).

On Windows, set GIT_BASH to the verified absolute Git Bash executable path;
never fall back to PATH's bash.exe, which may launch WSL instead.
All executable probes are intercepted; no real recipes or services are used.
"""

import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().with_name("env_report.sh")
PRELUDE = r"""
# Keep machine scripts/third-party CLIs out of the probe PATH.
export PATH=/usr/bin:/bin
npm() {
  [ "$*" = 'config get cache' ] || return 1
  printf '%s\n' "$TEST_CACHE"
}
node() {
  if [ "$#" -eq 1 ] && [ "$1" = --version ]; then
    printf 'v20.0.0\n'
    return
  fi
  # Capture the script's actual argv, never read or execute recipe.mjs.
  printf '%s\0' "$@" >> "$TEST_RECIPE_LOG"
  printf 'v1\n'
}
curl() {
  printf '%s\0' "$@" >> "$TEST_CURL_LOG"
  return 1
}
source "$1"
"""
PYTHON_STUB = r"""#!/usr/bin/env bash
printf '%s\0' "$@" >> "$TEST_PY_LOG"
exit "${TEST_PY_STATUS:-0}"
"""


def clean_env():
    return {
        key: value for key, value in os.environ.items()
        if key not in {"PROJECT", "BASH_ENV", "ENV"}
        and not key.startswith("BASH_FUNC_")
    }


def read_args(path):
    return path.read_bytes().decode("utf-8").rstrip("\0").split("\0")


def native_path(path):
    return os.path.normcase(os.path.abspath(path))


class EnvReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        executable = os.environ.get("GIT_BASH")
        if not executable and os.name != "nt":
            executable = shutil.which("bash")
        if not executable or not Path(executable).is_absolute() or not Path(executable).is_file():
            raise RuntimeError("Set GIT_BASH to a verified absolute Git Bash executable path")
        cls.bash = str(Path(executable).resolve())

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="env report test ")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.project = self.root / "ready project"
        self.empty = self.root / "empty project"
        # A local installation marker only; do not install or run Remotion.
        (self.project / "remotion" / "node_modules" / "remotion").mkdir(parents=True)
        self.empty.mkdir()
        self.skills = self.root / "isolated skills"
        self.agents = self.root / "isolated agents"
        self.profile = self.root / "isolated profile"
        for directory in (self.skills, self.agents, self.profile):
            directory.mkdir()
        credentials = self.profile / ".alibabacloud" / "credentials.ini"
        credentials.parent.mkdir()
        credentials.touch()
        self.python = self.root / "python with spaces" / "python-stub"
        self.python.parent.mkdir()
        self.python.write_text(PYTHON_STUB, encoding="utf-8", newline="\n")
        self.python.chmod(0o755)
        self.recipe_log = self.root / "recipe argv"
        self.py_log = self.root / "python argv"
        self.curl_log = self.root / "curl argv"

    def run_report(self, cwd, project=None, python_status=0):
        for log in (self.recipe_log, self.py_log, self.curl_log):
            log.write_bytes(b"")
        env = clean_env()
        env.update({
            "PY": self.python.as_posix(),
            "SKILLS_DIR": self.skills.as_posix(),
            "AGENTS_DIR": self.agents.as_posix(),
            "USERPROFILE": self.profile.as_posix(),
            "HOME": self.profile.as_posix(),
            "DASHSCOPE_API_KEY": "offline-test-not-a-key",
            "TEST_CACHE": (self.root / "empty npm cache").as_posix(),
            "TEST_RECIPE_LOG": self.recipe_log.as_posix(),
            "TEST_PY_LOG": self.py_log.as_posix(),
            "TEST_CURL_LOG": self.curl_log.as_posix(),
            "TEST_PY_STATUS": str(python_status),
        })
        if project is not None:
            env["PROJECT"] = project
        result = subprocess.run(
            [self.bash, "--noprofile", "--norc", "-c", PRELUDE,
             "env-report-test", SCRIPT.as_posix()],
            cwd=str(cwd), env=env, capture_output=True, text=True,
            encoding="utf-8", timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        states = dict((capability, state) for state, capability in re.findall(
            r"^\[(READY|ONDEMAND|BLOCKED)\s*\]\s+(\S+)", result.stdout, re.M
        ))
        return states, result.stdout

    def project_paths(self, project):
        variants = {"native": str(project), "forward-slash": project.as_posix()}
        if os.name == "nt":
            # Conversion uses the already located Git Bash, never a bare bash.
            result = subprocess.run(
                [self.bash, "--noprofile", "--norc", "-c", 'cygpath -u "$1"',
                 "path-conversion", str(project)],
                env=clean_env(), capture_output=True, text=True,
                encoding="utf-8", check=True, timeout=10,
            )
            variants["git-bash"] = result.stdout.strip()
        return variants

    def test_project_takes_precedence_over_cwd(self):
        for target, cwd, expected in (
            (self.project, self.empty, "READY"),
            (self.empty, self.project, "BLOCKED"),
        ):
            for style, project in self.project_paths(target).items():
                with self.subTest(style=style, expected=expected):
                    states, _ = self.run_report(cwd, project)
                    self.assertEqual(states["core.remotion"], expected)

    def test_unset_or_empty_project_uses_actual_cwd(self):
        for project in (None, ""):
            for cwd, expected in ((self.project, "READY"), (self.empty, "BLOCKED")):
                with self.subTest(project=project, cwd=cwd.name):
                    states, _ = self.run_report(cwd, project)
                    self.assertEqual(states["core.remotion"], expected)

    def test_recipe_receives_selected_project_root(self):
        cases = [(self.empty, value, self.project)
                 for value in self.project_paths(self.project).values()]
        cases.extend([
            (self.project, str(self.empty), self.empty),
            (self.project, None, self.project),
            (self.empty, None, self.empty),
            (self.project, "", self.project),
        ])
        for cwd, project, expected in cases:
            with self.subTest(cwd=cwd.name, project=project):
                states, _ = self.run_report(cwd, project)
                args = read_args(self.recipe_log)
                self.assertEqual(len(args), 4, args)
                self.assertEqual(args[1:3], ["list", "--hyperframes"])
                self.assertEqual(native_path(args[0]), native_path(
                    self.agents / "media-use" / "scripts" / "recipe.mjs"))
                self.assertEqual(native_path(args[3]), native_path(expected))
                self.assertEqual(states["scr.recipe"], "READY")

    def test_python_path_with_spaces_preserves_all_import_probes(self):
        capabilities = ["core.python", "cut.asr", "ren.manim",
                        "cloud.ic", "cloud.pptx", "cloud.dl"]
        for status, expected in ((0, "READY"), (1, "BLOCKED")):
            with self.subTest(exit_status=status):
                states, _ = self.run_report(self.empty, python_status=status)
                self.assertEqual([states[key] for key in capabilities], [expected] * 6)
                self.assertEqual(read_args(self.py_log), [
                    "-c", "import PIL,numpy,cv2",
                    "-c", "import faster_whisper",
                    "-c", "import manim",
                    "-c", "import alibabacloud_tea_openapi,oss2",
                    "-c", "import dashscope",
                    "-c", "import yt_dlp",
                ])

    def test_imagegen_is_explicitly_unverified_on_demand(self):
        states, output = self.run_report(self.empty)
        self.assertEqual(states["gen.imagegen"], "ONDEMAND")
        imagegen = re.search(r"^\[.*gen\.imagegen[^\n]*\n([^\n]*)", output, re.M)
        self.assertIsNotNone(imagegen)
        self.assertRegex(imagegen.group(1), r"未.*(?:调用|实调)")
        self.assertIn("额度", imagegen.group(1))

    def test_other_capabilities_and_summary_remain_present(self):
        states, output = self.run_report(self.empty)
        self.assertEqual(set(states), {
            "core.ffmpeg", "core.python", "core.node", "core.remotion",
            "gen.comfy", "gen.imagegen", "scr.knowledge", "scr.hyperframes",
            "scr.recipe", "scr.humanizer", "cut.local", "cut.asr", "cut.analyze",
            "ren.hyperframes", "ren.manim", "cloud.ic", "cloud.pptx", "cloud.dl",
        })
        self.assertEqual(states["core.node"], "READY")
        for key in ("gen.comfy", "scr.knowledge", "scr.hyperframes", "scr.humanizer",
                    "cut.local", "cut.analyze", "ren.hyperframes"):
            self.assertEqual(states[key], "BLOCKED", key)
        self.assertEqual(read_args(self.curl_log), [
            "-s", "-m", "2", "http://127.0.0.1:8188/system_stats",
        ])
        counts = tuple(sum(value == state for value in states.values())
                       for state in ("READY", "ONDEMAND", "BLOCKED"))
        self.assertIn("汇总：READY %d · ONDEMAND %d · BLOCKED %d" % counts, output)
        self.assertFalse((self.project / ".media").exists())
        self.assertFalse((self.empty / ".media").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)

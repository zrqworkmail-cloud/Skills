"""Safe integration tests: native Python samplers, never Remotion or typeperf.

Run from Git Bash with an explicit executable (never PATH-resolved bash):
  GIT_BASH="$(cygpath -aw /usr/bin/bash.exe)" python scripts/test_render.py
All fixtures live in a temporary directory, including the second sampler.
"""

import ctypes
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest


# Source the real, unmodified script. Functions intercept even the legacy
# absolute typeperf command. No taskkill/npx/node invocation reaches the host.
HARNESS = r'''
set -uo pipefail
RENDER_PID=$BASHPID
printf '%s\n' "$RENDER_PID" > "$TEST_STATE/render.shellpid"
record() { printf '%s\n' "$*" >> "$TEST_STATE/calls"; }
taskkill() { record "FORBIDDEN taskkill $*"; return 91; }
npx() {
  record "FORBIDDEN npx $*"
  # The legacy fallback returns immediately; let its native sampler register
  # first so even that failing path can be supervised and torn down safely.
  if [ "${2:-}" = render ]; then
    "$TEST_PYTHON" "$TEST_FILE" --wait-sampler
  fi
  return 92
}
netstat() { return 0; }
tasklist() { record "UNEXPECTED tasklist $*"; return 93; }
node() {
  "$TEST_PYTHON" "$TEST_FILE" --cli "$@"
  local rc=$?
  if [ -n "${TEST_SIGNAL:-}" ]; then
    # Only signal the render shell launched by this test, never a process group.
    builtin kill -s "$TEST_SIGNAL" "$RENDER_PID"
  fi
  return "$rc"
}
sample() {
  printf '%s\n' "$BASHPID" > "$TEST_STATE/owned.shellpid"
  exec "$TEST_PYTHON" "$TEST_FILE" --sampler owned "$@"
}
function /c/Windows/System32/typeperf.exe { sample "$@"; }
test_typeperf() { sample "$@"; }
# Fail closed if render.sh ever tries a different PID, a group, or extra PIDs.
# Valid requests still execute the real process tool, not a mocked success.
safe_kill() {
  local tool=$1 target=${!#} owned=""
  shift
  [ ! -f "$TEST_STATE/owned.shellpid" ] || read -r owned < "$TEST_STATE/owned.shellpid"
  record "kill $tool $*"
  if [[ ! "$target" =~ ^[1-9][0-9]*$ ]] || [ "$target" != "$owned" ]; then
    record "UNSAFE target $*"
    return 94
  fi
  if [ "$#" -eq 1 ]; then
    builtin kill "$target"
  elif [ "$#" -eq 4 ] && [ "$1 $2 $3" = '-f -s KILL' ]; then
    command /usr/bin/kill.exe -f -s KILL "$target"
  else
    record "UNSAFE arguments $*"
    return 94
  fi
}
kill() { safe_kill builtin "$@"; }
function /usr/bin/kill { safe_kill external "$@"; }
function /usr/bin/kill.exe { safe_kill external "$@"; }
export TYPEPERF_EXE=test_typeperf
source "$TEST_RENDER" "$@"
'''


def wait_for(path, timeout=8):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if path.exists():
            return
        time.sleep(0.02)
    raise AssertionError(f"Timed out waiting for {path.name}")


def sampler(kind, args):
    """A real native Windows process with a cooperative test-only escape hatch."""
    state = Path(os.environ["TEST_STATE"])
    info = {"pid": os.getpid(), "parent": os.getppid(), "args": args}
    # Atomic publication keeps the supervisor from observing partial JSON.
    pending = state / f"{kind}.pending"
    pending.write_text(json.dumps(info), encoding="utf-8")
    if kind == "owned" and "-o" in args:
        csv = Path(args[args.index("-o") + 1])
        if csv.parent.is_dir():
            csv.write_text('"time","cpu"\n"fake","0"\n', encoding="utf-8")
    pending.replace(state / f"{kind}.json")
    if kind == "owned" and os.environ.get("TEST_EARLY_EXIT") == "1":
        (state / "owned.finished").touch()
        return 23
    deadline = time.monotonic() + 20
    while not (state / "stop").exists() and time.monotonic() < deadline:
        time.sleep(0.02)
    return 0


def cli(args):
    state = Path(os.environ["TEST_STATE"])
    (state / "cli.json").write_text(json.dumps(args), encoding="utf-8")
    (state / "cli.ready").touch()
    wait_for(state / "release")
    print("FAKE_REMOTION_OUTPUT", flush=True)
    return int(os.environ["TEST_CLI_RC"])


class NativeProcess:
    """Hold a native handle so liveness checks cannot confuse reused PIDs."""

    def __init__(self, pid):
        self.api = ctypes.WinDLL("kernel32", use_last_error=True)
        self.api.OpenProcess.argtypes = [ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong]
        self.api.OpenProcess.restype = ctypes.c_void_p
        self.api.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
        self.api.WaitForSingleObject.restype = ctypes.c_ulong
        self.api.CloseHandle.argtypes = [ctypes.c_void_p]
        self.api.CloseHandle.restype = ctypes.c_int
        self.handle = self.api.OpenProcess(0x00100000, False, pid)  # SYNCHRONIZE only
        if not self.handle and ctypes.get_last_error() != 87:  # already exited
            raise ctypes.WinError(ctypes.get_last_error())

    def running(self):
        if not self.handle:
            return False
        result = self.api.WaitForSingleObject(self.handle, 0)
        if result not in (0, 258):
            raise ctypes.WinError(ctypes.get_last_error())
        return result == 258

    def close(self):
        if self.handle:
            self.api.CloseHandle(self.handle)
            self.handle = None


@unittest.skipUnless(os.name == "nt", "Requires Windows native processes and Git Bash")
class RenderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        configured = os.environ.get("GIT_BASH", "")
        cls.bash = Path(configured)
        if not configured or not cls.bash.is_absolute() or not cls.bash.is_file():
            raise RuntimeError("Set GIT_BASH to the absolute Git usr/bin/bash.exe path")
        version = subprocess.run(
            [str(cls.bash), "--noprofile", "--norc", "--version"],
            capture_output=True, text=True, check=True,
        ).stdout
        if "cygwin" not in version.lower():
            raise RuntimeError("GIT_BASH must be Git Bash, not WSL")
        cls.script = Path(__file__).resolve().with_name("render.sh")

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="render safe test ")
        self.root = Path(self.temp.name)
        self.project = self.root / "new project"
        (self.project / "remotion").mkdir(parents=True)
        self.env = os.environ.copy()
        # Do not allow a caller's startup script or extra flags into this fixture.
        for key in ("BASH_ENV", "ENV", "SHELLOPTS", "BASHOPTS", "REMOTION_EXTRA_ARGS"):
            self.env.pop(key, None)
        for key in list(self.env):
            if key.startswith("BASH_FUNC_"):
                del self.env[key]
        self.env.update(
            PROJECT=self.project.as_posix(),
            TEST_STATE=self.root.as_posix(),
            TEST_PYTHON=Path(sys.executable).as_posix(),
            TEST_FILE=Path(__file__).resolve().as_posix(),
            TEST_RENDER=self.script.as_posix(),
            TEST_CLI_RC="0", TEST_SIGNAL="", TEST_EARLY_EXIT="0",
        )
        self.harness = self.root / "harness.sh"
        self.harness.write_text(HARNESS, encoding="utf-8")
        self.process = None
        self.owned = None
        self.other = subprocess.Popen(
            [sys.executable, str(Path(__file__).resolve()), "--sampler", "other"],
            env=self.env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        wait_for(self.root / "other.json")

    def tearDown(self):
        # Cooperative release only affects fixture processes. Popen.kill below
        # is a timeout fallback for our exact shell handle, never an image name.
        (self.root / "stop").touch()
        (self.root / "release").touch()
        if self.process is not None:
            try:
                self.process.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.communicate(timeout=5)
        self.other.wait(timeout=5)
        if self.owned is None and (self.root / "owned.json").exists():
            info = json.loads((self.root / "owned.json").read_text(encoding="utf-8"))
            self.owned = NativeProcess(info["pid"])
        if self.owned is not None:
            deadline = time.monotonic() + 5
            while self.owned.running() and time.monotonic() < deadline:
                time.sleep(0.02)
            alive = self.owned.running()
            self.owned.close()
            self.assertFalse(alive, "fixture sampler survived cooperative teardown")
        self.temp.cleanup()

    def run_render(self, *, still=False, rc=0, missing=False, build=True,
                   interrupt="", early=False):
        if not missing:
            entry = self.project / "remotion/node_modules/@remotion/cli/remotion-cli.js"
            entry.parent.mkdir(parents=True)
            entry.touch()  # Never executed: node is intercepted at the shell boundary.
        if build:
            (self.project / "build").mkdir()
        self.env.update(TEST_CLI_RC=str(rc), TEST_SIGNAL=interrupt,
                        TEST_EARLY_EXIT="1" if early else "0")
        args = (["--still"] if still else []) + [(self.root / "output/result.mp4").as_posix()]
        self.process = subprocess.Popen(
            [str(self.bash), "--noprofile", "--norc", self.harness.as_posix(), *args],
            cwd=self.project, env=self.env, stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
        )
        if not missing:
            wait_for(self.root / "cli.ready")
            if not still:
                wait_for(self.root / "owned.json")
                info = json.loads((self.root / "owned.json").read_text(encoding="utf-8"))
                self.owned = NativeProcess(info["pid"])
                if early:
                    wait_for(self.root / "owned.finished")
                    deadline = time.monotonic() + 5
                    while self.owned.running() and time.monotonic() < deadline:
                        time.sleep(0.02)
                    self.assertFalse(self.owned.running(), "early-exit fixture is still live")
                else:
                    self.assertTrue(self.owned.running(), "sampler must be live before CLI exits")
            (self.root / "release").touch()
        output, _ = self.process.communicate(timeout=10)
        calls_file = self.root / "calls"
        calls = calls_file.read_text(encoding="utf-8") if calls_file.exists() else ""
        self.assertIsNone(self.other.poll(), "another sampler was terminated")
        return self.process.returncode, output, calls

    def assert_bounded(self, calls):
        self.assertNotIn("FORBIDDEN", calls, calls)
        self.assertNotIn("UNSAFE", calls, calls)
        self.assertNotIn("UNEXPECTED", calls, calls)

    def test_still_never_touches_sampling(self):
        rc, output, calls = self.run_render(still=True)
        self.assertEqual(rc, 0, output)
        self.assertIn("STILL_DONE", output)
        self.assertFalse((self.root / "owned.shellpid").exists())
        self.assertEqual(calls, "", "still must not request any process termination")

    def test_still_failure_never_touches_sampling(self):
        rc, output, calls = self.run_render(still=True, rc=17)
        self.assertEqual(rc, 1, output)
        self.assertIn("STILL_FAILED", output)
        self.assertFalse((self.root / "owned.shellpid").exists())
        self.assertEqual(calls, "", "failed still must not touch sampling either")

    def test_render_success_stops_only_its_native_child(self):
        rc, output, calls = self.run_render()
        self.assertEqual(rc, 0, output)
        self.assertIn("RENDER_DONE", output)
        self.assertFalse(self.owned.running(), "owned native sampler leaked")
        self.assert_bounded(calls)
        self.assertEqual(calls.count("kill "), 1, calls)
        self.assertIn("FAKE_REMOTION_OUTPUT", (self.project / "build/render_result.log").read_text())

    def test_render_failure_preserves_exit_status_and_cleans(self):
        rc, output, calls = self.run_render(rc=37)
        self.assertEqual(rc, 37, output)
        self.assertIn("RENDER_FAILED", output)
        self.assertNotIn("RENDER_DONE", output)
        self.assertFalse(self.owned.running(), "failed render leaked its native sampler")
        self.assert_bounded(calls)

    def test_new_project_creates_build_directory(self):
        rc, output, calls = self.run_render(build=False)
        self.assertEqual(rc, 0, output)
        self.assertTrue((self.project / "build/render_result.log").is_file())
        self.assertTrue((self.project / "build/cpu_result.csv").is_file())
        self.assertFalse(self.owned.running())
        self.assert_bounded(calls)

    def test_missing_cli_stops_without_npx_or_sampling(self):
        rc, output, calls = self.run_render(missing=True)
        self.assertEqual(rc, 2, output)
        self.assertIn("@remotion/cli", output)
        self.assertFalse((self.root / "owned.shellpid").exists())
        self.assertEqual(calls, "", "missing dependencies must not download or kill")

    def test_missing_cli_still_stops_without_npx(self):
        rc, output, calls = self.run_render(missing=True, still=True)
        self.assertEqual(rc, 2, output)
        self.assertIn("@remotion/cli", output)
        self.assertFalse((self.root / "owned.shellpid").exists())
        self.assertEqual(calls, "")

    def check_interrupt(self, signal_name, expected):
        rc, output, calls = self.run_render(interrupt=signal_name)
        self.assertEqual(rc, expected, output)
        self.assertNotIn("RENDER_DONE", output)
        self.assertFalse(self.owned.running(), f"{signal_name} leaked its sampler")
        self.assert_bounded(calls)
        self.assertEqual(calls.count("kill "), 1, calls)

    def test_term_exit_cleans_sampler(self):
        self.check_interrupt("TERM", 143)

    def test_int_exit_cleans_sampler(self):
        self.check_interrupt("INT", 130)

    def test_hup_exit_cleans_sampler(self):
        self.check_interrupt("HUP", 129)

    def test_exited_sampler_is_not_signalled_again(self):
        rc, output, calls = self.run_render(early=True)
        self.assertEqual(rc, 0, output)
        self.assertFalse(self.owned.running())
        self.assertEqual(calls, "", "an exited sampler PID must not be signalled")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--sampler":
        sys.exit(sampler(sys.argv[2], sys.argv[3:]))
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        sys.exit(cli(sys.argv[2:]))
    if len(sys.argv) > 1 and sys.argv[1] == "--wait-sampler":
        wait_for(Path(os.environ["TEST_STATE"]) / "owned.json")
        sys.exit(0)
    unittest.main(verbosity=2)

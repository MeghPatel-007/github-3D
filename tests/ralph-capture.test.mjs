import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("..", import.meta.url);
const windowsPathToBash = (value) => {
  const normalized = value.replaceAll("\\", "/");
  return /^[A-Za-z]:/.test(normalized)
    ? `/${normalized[0].toLowerCase()}${normalized.slice(2)}`
    : normalized;
};
const capturePath = windowsPathToBash(
  fileURLToPath(new URL("scripts/lib/capture.sh", root)),
);
const bashAvailable = spawnSync("bash", ["-c", "exit 0"]).status === 0;

function runCapture(fakeScript, command) {
  const directory = mkdtempSync(join(tmpdir(), "ralph-capture-"));
  const bin = join(directory, "bin");
  const output = join(directory, "output");
  const errors = join(directory, "errors");
  const script = join(bin, "script");
  const bashScript = `
    source "${capturePath}"
    start_agent_capture "${windowsPathToBash(output)}" "${windowsPathToBash(errors)}" '${command}'
  `;

  mkdirSync(bin);
  writeFileSync(script, fakeScript);
  chmodSync(script, 0o755);

  return { directory, output, errors, bashScript };
}

test("uses util-linux script ordering and captures successful output", {
  skip: !bashAvailable,
}, () => {
  const result = runCapture(
    `#!/bin/bash
if [ "$1" = "--version" ]; then echo "script (util-linux)"; exit 0; fi
[ "$1" = "-q" ] && [ "$2" = "-c" ] || exit 41
command="$3"; output="$4"
bash -c "$command" > "$output"
`,
    "printf success",
  );

  execFileSync("bash", ["-c", result.bashScript], {
    env: {
      ...process.env,
      PATH: `${join(result.directory, "bin")}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}`,
    },
  });
  assert.equal(readFileSync(result.output, "utf8"), "success");
  assert.equal(readFileSync(result.errors, "utf8"), "");
});

test("preserves launch diagnostics and failure status", {
  skip: !bashAvailable,
}, () => {
  const result = runCapture(
    `#!/bin/bash
if [ "$1" = "--version" ]; then echo "script (util-linux)"; exit 0; fi
echo "sbx failed to start" >&2
exit 23
`,
    "printf never-reached",
  );

  const process = spawnSync("bash", ["-c", result.bashScript], {
    env: {
      ...process.env,
      PATH: `${join(result.directory, "bin")}${process.platform === "win32" ? ";" : ":"}${process.env.PATH}`,
    },
    encoding: "utf8",
  });
  assert.equal(process.status, 23);
  assert.match(readFileSync(result.errors, "utf8"), /sbx failed to start/);
});

test("requires a host TTY and keeps background launch input attached", () => {
  const ralph = readFileSync(new URL("../ralph.sh", import.meta.url), "utf8");
  const agents = readFileSync(
    new URL("../scripts/lib/agents.sh", import.meta.url),
    "utf8",
  );
  const capture = readFileSync(
    new URL("../scripts/lib/capture.sh", import.meta.url),
    "utf8",
  );
  const spinner = readFileSync(
    new URL("../scripts/lib/spinner.sh", import.meta.url),
    "utf8",
  );

  assert.match(capture, /Ralph must be started from an interactive TTY/);
  assert.match(capture, /No pseudo-terminal capture command is available/);
  assert.match(capture, /SPINNER_ENABLED=false/);
  assert.match(capture, /script -q -c "\$agent_command" "\$output_file"/);
  assert.match(agents, /shell_quote_arg\(\)/);
  assert.match(agents, /command\+=" \$\(shell_quote_arg "\$arg"\)"/);
  assert.match(
    agents,
    /command\+=" -- run"[\s\S]*printf '%s %s' "\$command" "\$prompt_suffix"/,
  );
  assert.match(ralph, /start_agent_capture .*< \/dev\/tty &/);
  assert.match(ralph, /AGENT_EXIT_STATUS/);
  assert.match(ralph, /\[ "\$AGENT_EXIT_STATUS" -ne 0 \] \|\| \[ ! -s "\$OUTPUT_FILE" \]/);
  assert.match(spinner, /SPINNER_ENABLED/);
});

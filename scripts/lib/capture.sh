#!/bin/bash
# Agent output capture module for ralph.sh

# Check whether the host can provide the pseudo-terminal required by sbx.
check_capture_support() {
  if command -v script >/dev/null 2>&1; then
    CAPTURE_BACKEND=script
  elif command -v winpty >/dev/null 2>&1; then
    CAPTURE_BACKEND=winpty
    SPINNER_ENABLED=false
  else
    log_error "No pseudo-terminal capture command is available."
    log_error "Install util-linux 'script' on Unix, or use Git Bash with winpty on Windows."
    log_error "Ralph requires sbx and will not launch an iteration without a pseudo-terminal."
    return 1
  fi

  if [ ! -t 0 ] && [ ! -r /dev/tty ]; then
    log_error "Ralph must be started from an interactive TTY."
    log_error "Run it from Windows Git Bash or a supported Unix terminal, not a redirected pipe or background job."
    return 1
  fi
}

# Run the agent through the best available pseudo-terminal and capture stderr.
start_agent_capture() {
  local output_file="$1"
  local error_file="$2"
  local agent_command="$3"

  : > "$error_file"
  if command -v script >/dev/null 2>&1; then
    script -q -c "$agent_command" "$output_file" 2>"$error_file"
    return $?
  fi

  if command -v winpty >/dev/null 2>&1; then
    winpty bash -c "$agent_command" >"$output_file" 2>"$error_file"
    return $?
  fi

  echo "No pseudo-terminal capture command is available." >"$error_file"
  return 127
}

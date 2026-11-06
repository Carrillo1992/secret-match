#!/usr/bin/env bash
# PreToolUse hook (Write): a new Angular page or user-visible component may only be created
# after the `design` skill has run in this session. See frontend/CLAUDE.md.
set -euo pipefail

input=$(cat)
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
transcript=$(jq -r '.transcript_path // empty' <<<"$input")
root=${CLAUDE_PROJECT_DIR:-$(jq -r '.cwd // empty' <<<"$input")}

[[ -z "$file" ]] && exit 0
# Only new files: editing or rewriting an existing file is not "creating a screen".
[[ -e "$file" ]] && exit 0

rel=${file#"$root"/}
case "$rel" in
  *.spec.ts) exit 0 ;;
  frontend/src/app/features/*/pages/* | frontend/src/app/features/*/components/* | frontend/src/app/shared/ui/*) ;;
  *) exit 0 ;;
esac

# The skill ran if the transcript shows a Skill call for it or the user typed /design.
if [[ -n "$transcript" && -f "$transcript" ]] &&
  grep -Eq '"skill":"([^"]*:)?design"|<command-name>/design<' "$transcript"; then
  exit 0
fi

jq -n --arg f "$rel" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("Creating " + $f + " is blocked: new pages and user-visible components need the `design` skill first (frontend/CLAUDE.md). Run the design skill, let the human choose an option, record it on the ticket, then create the file.")
  }
}'

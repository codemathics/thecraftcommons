#!/usr/bin/env bash
# Idempotent: copy public repo skills into the cloud VM home (~/.cursor/skills).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/.cursor/skills"
DEST="${HOME}/.cursor/skills"

if [[ ! -d "$SRC" ]]; then
  echo "install-personal-skills: missing $SRC" >&2
  exit 1
fi

mkdir -p "$DEST"

copied=0
for skill_dir in "$SRC"/*/SKILL.md; do
  [[ -f "$skill_dir" ]] || continue
  name="$(basename "$(dirname "$skill_dir")")"
  mkdir -p "$DEST/$name"
  cp -f "$skill_dir" "$DEST/$name/SKILL.md"
  copied=$((copied + 1))
  echo "installed public skill: $name -> $DEST/$name/SKILL.md"
done

if [[ "$copied" -eq 0 ]]; then
  echo "install-personal-skills: no SKILL.md files found under $SRC" >&2
  exit 1
fi

echo "install-personal-skills: done ($copied public skills -> $DEST)"

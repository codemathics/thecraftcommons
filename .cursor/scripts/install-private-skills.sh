#!/usr/bin/env bash
# Optional: install private personal skills onto the cloud VM.
# Requires Cursor Cloud secret PERSONAL_SKILLS_TOKEN (GitHub PAT with read
# access to the private skills repo). No-ops cleanly when the secret is absent
# so public Builds still succeed.
set -euo pipefail

REPO_SLUG="${PERSONAL_SKILLS_REPO:-codemathics/cursor-personal-skills}"
DEST="${HOME}/.cursor/skills"
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

if [[ -z "${PERSONAL_SKILLS_TOKEN:-}" ]]; then
  echo "install-private-skills: PERSONAL_SKILLS_TOKEN unset — skipping private skills"
  exit 0
fi

echo "install-private-skills: cloning $REPO_SLUG (shallow)"
git clone --depth 1 \
  "https://x-access-token:${PERSONAL_SKILLS_TOKEN}@github.com/${REPO_SLUG}.git" \
  "$TMP/skills"

mkdir -p "$DEST"
copied=0
for skill_dir in "$TMP/skills"/*/SKILL.md; do
  [[ -f "$skill_dir" ]] || continue
  name="$(basename "$(dirname "$skill_dir")")"
  # skip non-skill dirs if any
  mkdir -p "$DEST/$name"
  cp -f "$skill_dir" "$DEST/$name/SKILL.md"
  copied=$((copied + 1))
  echo "installed private skill: $name -> $DEST/$name/SKILL.md"
done

if [[ "$copied" -eq 0 ]]; then
  echo "install-private-skills: clone succeeded but no SKILL.md files found" >&2
  exit 1
fi

echo "install-private-skills: done ($copied private skills -> $DEST)"

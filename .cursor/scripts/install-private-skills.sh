#!/usr/bin/env bash
# Optional: install private personal skills onto the cloud VM.
#
# Auth (first match wins):
#   1. PERSONAL_SKILLS_SSH_KEY_B64  — base64 of a read-only deploy private key
#   2. PERSONAL_SKILLS_SSH_KEY      — raw PEM/OpenSSH private key (multiline)
#   3. PERSONAL_SKILLS_TOKEN        — GitHub PAT with Contents:Read on the private repo
#
# No-ops cleanly when none are set so public Builds still succeed.
set -euo pipefail

REPO_SLUG="${PERSONAL_SKILLS_REPO:-codemathics/cursor-personal-skills}"
DEST="${HOME}/.cursor/skills"
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

clone_via_ssh() {
  local key_file="$1"
  chmod 600 "$key_file"
  export GIT_SSH_COMMAND="ssh -i ${key_file} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
  git clone --depth 1 "git@github.com:${REPO_SLUG}.git" "$TMP/skills"
}

clone_via_https_token() {
  git clone --depth 1 \
    "https://x-access-token:${PERSONAL_SKILLS_TOKEN}@github.com/${REPO_SLUG}.git" \
    "$TMP/skills"
}

if [[ -n "${PERSONAL_SKILLS_SSH_KEY_B64:-}" ]]; then
  echo "install-private-skills: using PERSONAL_SKILLS_SSH_KEY_B64"
  KEY_FILE="$TMP/deploy.key"
  printf '%s' "$PERSONAL_SKILLS_SSH_KEY_B64" | base64 --decode > "$KEY_FILE"
  clone_via_ssh "$KEY_FILE"
elif [[ -n "${PERSONAL_SKILLS_SSH_KEY:-}" ]]; then
  echo "install-private-skills: using PERSONAL_SKILLS_SSH_KEY"
  KEY_FILE="$TMP/deploy.key"
  printf '%s\n' "$PERSONAL_SKILLS_SSH_KEY" > "$KEY_FILE"
  clone_via_ssh "$KEY_FILE"
elif [[ -n "${PERSONAL_SKILLS_TOKEN:-}" ]]; then
  echo "install-private-skills: using PERSONAL_SKILLS_TOKEN"
  clone_via_https_token
else
  echo "install-private-skills: no auth secret set — skipping private skills"
  exit 0
fi

mkdir -p "$DEST"
copied=0
for skill_dir in "$TMP/skills"/*/SKILL.md; do
  [[ -f "$skill_dir" ]] || continue
  name="$(basename "$(dirname "$skill_dir")")"
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

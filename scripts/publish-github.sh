#!/usr/bin/env bash
# Publishes this repository to GitHub as a public repo (hackathon rule: repositories must be public).
# Needs a GitHub account. The only manual step is approving the login once in the browser.
set -euo pipefail

GH="${GH:-$HOME/.local/gh/bin/gh}"
REPO_NAME="${REPO_NAME:-judgment-audit}"
cd "$(dirname "$0")/.."

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "Log in to GitHub: a one-time code appears below and the browser opens. Paste the code and approve."
  "$GH" auth login --hostname github.com --git-protocol https --web
fi
"$GH" auth setup-git

if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
else
  "$GH" repo create "$REPO_NAME" --public --source . --remote origin --push \
    --description "A 15-minute audit that shows a creative team how consistently it judges the same work."
fi

echo "Published: $("$GH" repo view --json url -q .url)"

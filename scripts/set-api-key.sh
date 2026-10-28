#!/usr/bin/env bash
# Saves the Meta Model API key into .env.local without it passing through chat or showing on screen.
# Usage: run this script, then paste the key at the prompt and press Enter (nothing is echoed).
set -euo pipefail
cd "$(dirname "$0")/.."

read -rs -p "Paste the Meta API key, then press Enter (it stays hidden): " KEY
echo
KEY="$(printf '%s' "$KEY" | tr -d '[:space:]')"
if [ "${#KEY}" -lt 20 ]; then
  echo "Got ${#KEY} characters, which is too short for an API key. Copy the key again and rerun this script."
  exit 1
fi

touch .env.local
chmod 600 .env.local
grep -v '^MODEL_API_KEY=' .env.local > .env.local.tmp || true
echo "MODEL_API_KEY=$KEY" >> .env.local.tmp
mv .env.local.tmp .env.local
chmod 600 .env.local

# Clear the clipboard so the key doesn't linger there.
printf '' | pbcopy
echo "Saved: MODEL_API_KEY (${#KEY} characters, ends with ...${KEY: -4}). Clipboard cleared."

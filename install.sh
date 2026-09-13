#!/usr/bin/env sh
# openooda.org/install.sh — fetch the canonical installer, then run it.
# Source of truth: openOODA/install/install.sh on GitHub (branch: main)
# Failed download must not exec an empty script (no curl | bash).
set -e
TMP=$(mktemp) || exit 1
trap 'rm -f "$TMP"' EXIT
curl -fsSL "https://raw.githubusercontent.com/openOODA/install/main/install.sh" -o "$TMP"
bash "$TMP" "$@"

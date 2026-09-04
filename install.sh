#!/usr/bin/env sh
# openooda.org/install.sh — thin redirect to the canonical install script.
# Source of truth: openOODA/packaging/install.sh on GitHub (branch: main)
curl -fsSL "https://raw.githubusercontent.com/openOODA/packaging/main/install.sh" "$@" | bash

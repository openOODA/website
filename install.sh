#!/usr/bin/env sh
# openooda.org/install.sh — thin redirect to the canonical install script.
# Source of truth lives in openOODA/packaging/install.sh on GitHub.
# This file exists so that `curl -fsSL https://openooda.org/install.sh | sh`
# works without anyone having to know the raw.githubusercontent.com URL.
exec curl -fsSL "https://raw.githubusercontent.com/openOODA/packaging/main/install.sh" "$@"

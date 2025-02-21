#!/bin/bash
set -euxo pipefail

source ~/.profile

cd ~/atlas

# Install dependencies
zsh -c "pnpm i --no-frozen-lockfile && pnpm build"
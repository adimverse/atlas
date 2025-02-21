#!/bin/bash
set -euxo pipefail

source ~/.profile
source ~/.zshrc

cd ~/atlas

# Install dependencies
zsh -c "pnpm i --no-frozen-lockfile && pnpm build"
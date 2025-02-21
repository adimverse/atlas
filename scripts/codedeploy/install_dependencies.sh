#!/bin/bash
set -euxo pipefail

# Install dependencies
cd ~/atlas
nvm use 23.3.0
sudo /home/ubuntu/.local/share/pnpm/pnpm i --no-frozen-lockfile

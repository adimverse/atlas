#!/bin/bash
set -euxo pipefail

# Install dependencies
cd ~/atlas
sudo /home/ubuntu/.local/share/pnpm/pnpm i --no-frozen-lockfile

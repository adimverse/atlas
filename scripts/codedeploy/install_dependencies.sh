#!/bin/bash
set -euxo pipefail

cd ~/atlas

# Install dependencies
sudo pnpm i --no-frozen-lockfile
sudo pnpm build
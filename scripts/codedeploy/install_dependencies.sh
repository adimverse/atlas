#!/bin/bash
set -euxo pipefail

cd ~/atlas

# Install dependencies
pnpm i --no-frozen-lockfile
pnpm build
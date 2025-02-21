#!/bin/bash
set -euxo pipefail

export PATH="/home/ubuntu/.local/share/pnpm:/home/ubuntu/.nvm/versions/node/v23.3.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:$PATH"

cd ~/atlas

# Install dependencies
pnpm i --no-frozen-lockfile
pnpm build
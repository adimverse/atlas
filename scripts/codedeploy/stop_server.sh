#!/bin/bash
set -euxo pipefail

# Stop the atlas-direct-agent service if it exists.
sudo systemctl stop atlas-direct-agent || true

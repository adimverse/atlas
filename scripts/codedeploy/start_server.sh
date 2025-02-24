#!/bin/bash
set -euxo pipefail

# Copy and overwrite the new service definition.
sudo cp -f scripts/atlas-direct-agent.service /etc/systemd/system/atlas-direct-agent.service

# Reload systemd to recognize the new service.
sudo systemctl daemon-reload

# Enable the atlas-direct-agent service to start at boot.
sudo systemctl enable atlas-direct-agent.service

# Start the atlas-direct-agent service.
sudo systemctl start atlas-direct-agent.service
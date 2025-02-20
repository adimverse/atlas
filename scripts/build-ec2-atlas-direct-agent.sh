#!/bin/zsh

set -e  # Exit immediately if a command exits with a non-zero status

source ~/.zshrc

# Stop the service
sudo systemctl stop atlas-direct-agent

# Navigate to project directory
cd ~/atlas || exit

# Reset any local changes
git checkout .
git clean -fd

# Switch to the deployment branch
git checkout develop

git pull

# Install dependencies
pnpm i --no-frozen-lockfile

# Build the project
pnpm build

# Restart the service
sudo systemctl start atlas-direct-agent

echo "Deployment complete!"
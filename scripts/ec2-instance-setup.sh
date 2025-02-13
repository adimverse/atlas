#!/bin/bash
set -eux

# Update system packages
sudo apt update && sudo apt upgrade -y

# Enable swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Install required software
sudo apt install -y zsh tmux git curl wget build-essential

# Set default shell to zsh for the ubuntu user
sudo chsh -s $(which zsh) ubuntu

export HOME="/home/ubuntu"
export PROFILE="$HOME/.zshrc"

# OhMyZsh
echo 'y' | sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
sed s/robbyrussell/alanpeabody/ ~/.zshrc > ~/.zshrc

# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Install pnpm globally
curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=9.15.0 sh -

# Install Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release 
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(sudo dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
sudo newgrp docker

# Cleanup
# sudo apt autoremove -y

# Reboot to apply changes (optional, but useful for ensuring swap and shell changes take effect)
# sudo reboot
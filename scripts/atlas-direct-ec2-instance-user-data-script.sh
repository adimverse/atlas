#!/bin/bash 

# To be used as User Data in EC2 instances running AmazonLinux2023
# Sets up a clean instance with all dependencies, clones the git repo, builds and runs Atlas as a service.

# Enable swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

sudo yum update -y
sudo yum install -y git python3 python3-pip curl libtool autoconf automake opus-devel make gcc-c++ cairo-devel libjpeg-devel pango-devel giflib-devel openssl openssl-devel 
# installs the equivalent of build-essential
sudo yum groupinstall -y 'Development Tools'

# Download and run the setup script for Node 23.x:
curl -fsSL https://rpm.nodesource.com/setup_23.x | sudo bash -

# Install Node.js (this will include npm)
sudo dnf install nodejs -y

sudo npm install -g pnpm@9.15.0
sudo npm install -g node-gyp

# Create the service file
sudo tee /etc/systemd/system/atlas-direct-agent.service > /dev/null << 'EOF'
[Unit]
Description=Atlas Direct Agent
After=network.target

[Service]
ExecStart=/bin/bash -c "pnpm start --character=atlas.character.direct.json"
WorkingDirectory=/home/ec2-user/atlas
Restart=always
User=ec2-user
Group=ec2-user
SyslogIdentifier=atlas-direct-agent

[Install]
WantedBy=multi-user.target
EOF

# Wait to ensure the file system has flushed the file
sleep 10

sudo chmod 644 /etc/systemd/system/atlas-direct-agent.service
sudo systemctl daemon-reload
sudo systemctl enable atlas-direct-agent

# clone the git repo
git clone https://github.com/adimverse/atlas.git /home/ec2-user/atlas
sudo chown -R ec2-user:ec2-user /home/ec2-user/atlas

# Install and set up the service to start running
sudo -u ec2-user bash -c 'cd ~/atlas && pnpm install --no-frozen-lockfile && pnpm build'

# Attempt to fetch a stable version of the .env file from AWS SecretsManager
printf "%b" "$(aws secretsmanager get-secret-value --secret-id AtlasDirect --query SecretString --output=text | jq -r .EnvFile)" > /home/ec2-user/atlas/.env
sudo chown ec2-user:ec2-user /home/ec2-user/atlas/.env

# Start the atlas-direct-agent service
sudo systemctl start atlas-direct-agent
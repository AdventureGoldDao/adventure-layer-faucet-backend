#!/bin/bash

# Update the system package list
echo "Updating package list..."
apt-get update

# Install necessary dependencies
echo "Installing required dependencies..."
apt-get install -y curl python3 g++ make

# Install Node.js (using the NodeSource repository)
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_14.x | bash -
apt-get install -y nodejs

# Install npm (Node.js package manager)
echo "Installing npm..."
apt-get install -y npm

# Install PM2
echo "Installing PM2..."
npm install -g pm2

# Verify the installations
echo "Verifying installations..."

# Check the versions of Node.js and npm
node -v
npm -v

# Check the version of PM2
pm2 -v

echo "Node.js, npm, and PM2 have been successfully installed!"

# install node modules
cd ..
npm install

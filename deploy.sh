#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to update hardhat.config.ts with new JMT address
update_hardhat_config() {
    local jmt_address=$1
    local config_file="hardhat.config.ts"

    sed -i '' -e "/JellyfishMerkleTreeVerifier:/{s/:.*/: \"$jmt_address\",/;n;d;}" "$config_file"

    echo "Updated $config_file with new JMT address: $jmt_address"
}

# # Step 1: Deploy ZKSync contract
# echo "Deploying ZKSync contract..."
# npx hardhat run scripts/3_zksync.ts --network zksync

# # Step 2: Deploy JMT contract
# echo "Deploying JMT contract..."
# npx hardhat run scripts/5_jmt.ts --network zksync2

# Prompt user for the new JMT address
read -p "Enter the new JellyfishMerkleTreeVerifier address: " jmt_address

# Update hardhat.config.ts with the new JMT address
update_hardhat_config "$jmt_address"

# Step 3: Deploy ZKSync2 contract
echo "Deploying ZKSync2 contract..."
npx hardhat run scripts/4_zksync2.ts --network zksync2

echo "Deployment process completed successfully!"

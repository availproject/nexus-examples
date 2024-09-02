#!/bin/bash

# Exit immediately if a command exits with a non-zero status and print all commands
set -euo pipefail

# Log file to capture all output
LOG_FILE="deployment.log"
exec > >(tee -i $LOG_FILE) 2>&1

# Function to log errors
log_error() {
    echo "[ERROR] $1"
    echo "[INFO] Refer to $LOG_FILE for more details."
    exit 1
}

# Function to update hardhat.config.ts with new JMT address
update_hardhat_config() {
    local jmt_address=$1
    local config_file="hardhat.config.ts"

    if sed -i '' -e "/JellyfishMerkleTreeVerifier:/{s/:.*/: \"$jmt_address\",/;n;d;}" "$config_file"; then
        echo "Updated $config_file with new JMT address: $jmt_address"
    else
        log_error "Failed to update $config_file with new JMT address."
    fi
}

# Function to update config.json with new addresses
update_config_json() {
    local payment_contract_address=$1
    local payment_token_address=$2
    local state_manager_address=$3
    local nft_address=$4
    local config_file="./off-chain/zknft/src/config_j.json"

    # Use jq to update the config.json file in-place if sponge is available
    if command -v sponge &> /dev/null; then
        if ! jq --arg paymentContractAddress "$payment_contract_address" \
            --arg paymentTokenAddr "$payment_token_address" \
            --arg stateManagerNFTChainAddr "$state_manager_address" \
            --arg storageNFTChainAddress "$nft_address" \
            '.paymentContractAddress = $paymentContractAddress | .paymentTokenAddr = $paymentTokenAddr | .stateManagerNFTChainAddr = $stateManagerNFTChainAddr | .storageNFTChainAddress = $storageNFTChainAddress' \
            "$config_file" | sponge "$config_file"; then
            log_error "Failed to update $config_file with new addresses. Please updated manually or try again."
        fi
    else
        # Fallback to using a temporary file and delete it afterward
        tmp_file=$(mktemp)
        if ! jq --arg paymentContractAddress "$payment_contract_address" \
            --arg paymentTokenAddr "$payment_token_address" \
            --arg stateManagerNFTChainAddr "$state_manager_address" \
            --arg storageNFTChainAddress "$nft_address" \
            '.paymentContractAddress = $paymentContractAddress | .paymentTokenAddr = $paymentTokenAddr | .stateManagerNFTChainAddr = $stateManagerNFTChainAddr | .storageNFTChainAddress = $storageNFTChainAddress' \
            "$config_file" > "$tmp_file" && mv "$tmp_file" "$config_file"; then
            rm -f "$tmp_file"
            log_error "Failed to update $config_file with new addresses. Please updated manually or try again."
        fi
        rm -f "$tmp_file"
    fi

    echo "Updated $config_file with new addresses:"
    echo "  paymentContractAddress: $payment_contract_address"
    echo "  paymentTokenAddr: $payment_token_address"
    echo "  stateManagerNFTChainAddr: $state_manager_address"
    echo "  storageNFTChainAddress: $nft_address"
}

# Function to extract addresses from deployment JSON files
extract_addresses() {
    local nft_payment_json="deployments-zk/zksync/contracts/example/zknft/NftPayment.sol/NFTPayment.json"
    local erc20_token_json="deployments-zk/zksync/contracts/example/mock/ERC20.sol/ERC20Token.json"
    local state_manager_json="deployments-zk/zksync2/contracts/NexusProofManager.sol/NexusProofManager.json"
    local my_nft_json="deployments-zk/zksync2/contracts/example/zknft/NFT.sol/MyNFT.json"

    # Extract paymentContractAddress from NFTPayment.json
    local payment_contract_address=$(jq -r '.entries[0].address' "$nft_payment_json") || log_error "Failed to extract payment contract address."
    # Extract paymentTokenAddr from ERC20Token.json
    local payment_token_address=$(jq -r '.entries[0].address' "$erc20_token_json") || log_error "Failed to extract payment token address."
    # Extract stateManagerNFTChainAddr from NexusProofManager.json
    local state_manager_address=$(jq -r '.entries[0].address' "$state_manager_json") || log_error "Failed to extract state manager address."
    # Extract storageNFTChainAddress from NFT.json
    local nft_address=$(jq -r '.entries[0].address' "$my_nft_json") || log_error "Failed to extract NFT address."

    echo "Extracted addresses:"
    echo "  paymentContractAddress: $payment_contract_address"
    echo "  paymentTokenAddr: $payment_token_address"
    echo "  stateManagerNFTChainAddr: $state_manager_address"
    echo "  storageNFTChainAddress: $nft_address"

    # Update config.json with the extracted addresses
    update_config_json "$payment_contract_address" "$payment_token_address" "$state_manager_address" "$nft_address"
}

# Step 1: Deploy ZKSync contract
echo "Deploying ZKSync contract..."
if ! npx hardhat run scripts/3_zksync.ts --network zksync; then
    log_error "Failed to deploy ZKSync contract. Please check your environment and try again."
fi

# Step 2: Deploy JMT contract
echo "Deploying JMT contract..."
if ! npx hardhat run scripts/5_jmt.ts --network zksync2; then
    log_error "Failed to deploy JMT contract. Please check your environment and try again."
fi

# Prompt user for the new JMT address
read -p "Enter the new JellyfishMerkleTreeVerifier address: " jmt_address

# Update hardhat.config.ts with the new JMT address
update_hardhat_config "$jmt_address"

# Step 3: Deploy ZKSync2 contract
echo "Deploying ZKSync2 contract..."
if ! npx hardhat run scripts/4_zksync2.ts --network zksync2; then
    log_error "Failed to deploy ZKSync2 contract. Please check your environment and try again."
fi

# Extract deployment information and update config.json
echo "Extracting deployment information and updating config.json..."
extract_addresses

echo "Deployment process completed successfully!"

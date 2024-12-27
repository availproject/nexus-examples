#!/bin/bash

# Function to switch appId and appId2 in deploy-config.json
switch_app_ids() {
    if [ "$CHAIN" -eq 1 ]; then
        jq '.zksync.appId = "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e" | .zksync.appId2 = "0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d"' lib/nexus/contracts/deploy-config.json >tmp.$$.json && mv tmp.$$.json lib/nexus/contracts/deploy-config.json
    elif [ "$CHAIN" -eq 2 ]; then
        jq '.zksync.appId = "0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d" | .zksync.appId2 = "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e"' lib/nexus/contracts/deploy-config.json >tmp.$$.json && mv tmp.$$.json lib/nexus/contracts/deploy-config.json
    fi
}

# Function to run Forge and log output
# Function to run Forge and log output
run_forge() {
    cd lib/nexus/contracts

    # Load the .env file if it exists
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi

    local chain_url=$1
    local output_file=$2

    # Pass the environment variables directly to forge

    if ! forge script script/Nexus-zksync.sol --rpc-url "$chain_url" --zksync --broadcast >"../../../$output_file" 2>&1; then
        echo "Error running Forge script. Check output for details."
        cat "../../$output_file" # Show the output if the command failed
        exit 1
    fi

    cd "$original_dir"
}

# Store the original directory
original_dir=$(pwd)

# Deploy with Forge for Chain 1
CHAIN=1
switch_app_ids # Set appId for Chain 1
run_forge "http://zksync2.nexus.avail.tools" "forge_output1.txt"

# Capture the addresses from the first deployment
mailBoxAddress1=$(grep -o 'Mailbox deployed to: 0x[a-fA-F0-9]\{40\}' forge_output1.txt | awk '{print $4}' | xargs)
proofManagerAddress1=$(grep -o 'NexusProofManager deployed to: 0x[a-fA-F0-9]\{40\}' forge_output1.txt | awk '{print $4}' | xargs)

# Adjust the patterns based on your output
# In case the output has leading spaces or other formatting issues, you can try matching it more broadly

mailBoxAddress1=$(grep -o 'Mailbox deployed to: *0x[a-fA-F0-9]\{40\}' forge_output1.txt | awk '{print $NF}' | xargs)
proofManagerAddress1=$(grep -o 'NexusProofManager deployed to: *0x[a-fA-F0-9]\{40\}' forge_output1.txt | awk '{print $NF}' | xargs)

# Debug: print the captured addresses
echo "Captured Mailbox Address 1: $mailBoxAddress1"
echo "Captured Proof Manager Address 1: $proofManagerAddress1"

# Check if addresses were captured successfully for Chain 1
if [ -z "$mailBoxAddress1" ]; then
    echo "Error: Mailbox address 1 not found."
    echo "Forge output for Chain 1:"
    cat forge_output1.txt
    exit 1
fi

if [ -z "$proofManagerAddress1" ]; then
    echo "Error: Proof Manager address 1 not found."
    echo "Forge output for Chain 1:"
    cat forge_output1.txt
    exit 1
fi

# Deploy with Forge for Chain 2 (swapping appId and appId2)
CHAIN=2
switch_app_ids # Swap appId for Chain 2
run_forge "http://zksync1.nexus.avail.tools" "forge_output2.txt"

# Capture the addresses from the second deployment
# Capture the addresses from the first deployment
mailBoxAddress2=$(grep -o 'Mailbox deployed to: 0x[a-fA-F0-9]\{40\}' forge_output2.txt | awk '{print $4}')
proofManagerAddress2=$(grep -o 'NexusProofManager deployed to: 0x[a-fA-F0-9]\{40\}' forge_output2.txt | awk '{print $4}')

mailBoxAddress2=$(grep -o 'Mailbox deployed to: *0x[a-fA-F0-9]\{40\}' forge_output2.txt | awk '{print $NF}' | xargs)
proofManagerAddress2=$(grep -o 'NexusProofManager deployed to: *0x[a-fA-F0-9]\{40\}' forge_output2.txt | awk '{print $NF}' | xargs)

# Debug: print the captured addresses
echo "Captured Mailbox Address 2: $mailBoxAddress2"
echo "Captured Proof Manager Address 2: $proofManagerAddress2"

# Check if addresses were captured successfully for Chain 2
if [ -z "$mailBoxAddress2" ]; then
    echo "Error: Mailbox address 2 not found."
    echo "Forge output for Chain 2:"
    cat forge_output2.txt
    exit 1
fi

if [ -z "$proofManagerAddress2" ]; then
    echo "Error: Proof Manager address 2 not found."
    echo "Forge output for Chain 2:"
    cat forge_output2.txt
    exit 1
fi

# Deploy the first NFT contract (6_nft_zksync)
output=$(npx hardhat 6_nft_zksync --network zksync2 --mailbox "$mailBoxAddress1")

# Check if the first NFT contract address was successfully retrieved
if [ -z "$output" ]; then
    echo "Error: No output from the 6_nft_zksync task."
    exit 1
fi

nftContractAddress=$(echo "$output" | jq -r '.nftContractAddress')

echo "Captured NFT Contract Address 1: $nftContractAddress"

# Run the 7_nftpayment_zksync task and capture JSON output
output=$(npx hardhat 7_nftpayment_zksync --network zksync --mailbox "$mailBoxAddress2" --nft "$nftContractAddress")

# Check if the output is empty
if [ -z "$output" ]; then
    echo "Error: No output from the 7_nftpayment_zksync task."
    exit 1
fi

# Parse the JSON output to extract contract addresses
nftPaymentContractAddress=$(echo "$output" | jq -r '.nftPaymentContractAddress')
tokenContractAddress=$(echo "$output" | jq -r '.tokenContractAddress')

# Check if both addresses were successfully retrieved
if [ -z "$nftPaymentContractAddress" ] || [ -z "$tokenContractAddress" ]; then
    echo "Error: One or both contract addresses not found."
    exit 1
fi

echo "Captured NFT Payment Contract Address: $nftPaymentContractAddress"
echo "Captured Token Contract Address: $tokenContractAddress"

# Store the captured addresses in deployed_addresses.json in the required location
cat <<EOT >off-chain/zknft-mailbox/deployed_addresses.json
{
  "mailBoxAddress1": "$mailBoxAddress1",
  "proofManagerAddress1": "$proofManagerAddress1",
  "mailBoxAddress2": "$mailBoxAddress2",
  "proofManagerAddress2": "$proofManagerAddress2",
  "nftContractAddress": "$nftContractAddress",
  "nftPaymentContractAddress": "$nftPaymentContractAddress",
  "tokenContractAddress": "$tokenContractAddress"
}
EOT

echo "Deployment complete. Addresses stored in off-chain/zknft-mailbox/deployed_addresses.json"

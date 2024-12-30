import { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Get environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const NEXUS_APP_ID = process.env.NEXUS_APP_ID_SEPOLIA || "";
const MAILBOX_ADDRESS = process.env.MAILBOX_ADDRESS_SEPOLIA || "";

if (!PRIVATE_KEY || !NEXUS_APP_ID || !MAILBOX_ADDRESS) {
  throw new Error("Missing required environment variables");
}

async function main() {
  console.log(`Running deploy script for bridge contract on Sepolia`);

  // Initialize the wallet
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // Deploy AvailToken contract
  console.log("Deploying ERC20Token contract...");
  const AvailToken = await ethers.getContractFactory("ERC20Token", wallet);
  const availToken = await AvailToken.deploy("Avail", "AVAIL");
  const availTokenAddress = await availToken.getAddress();
  console.log(`ERC20Token deployed to: ${availTokenAddress}`);

  // Get deployer's public address
  const publicAddress = await wallet.getAddress();

  // Deploy Bridge Contract
  console.log("Deploying NexusBridge contract...");
  const Bridge = await ethers.getContractFactory("NexusLockMintBridge", wallet);
  const bridgeContract = await upgrades.deployProxy(Bridge, [
    publicAddress, // Fee collector
    availTokenAddress, // token
    publicAddress, // governance
    publicAddress, // pauser
    MAILBOX_ADDRESS,
  ]);

  const bridgeAddress = await bridgeContract.getAddress();
  console.log(`NexusBridge contract deployed to: ${bridgeAddress}`);

  // Log deployment summary
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log(`ERC20Token: ${availTokenAddress}`);
  console.log(`NexusBridge: ${bridgeAddress}`);

  // Wait for a few block confirmations
  console.log("\nWaiting for block confirmations...");

  // Verify contracts on Etherscan
  console.log("\nVerifying contracts on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: availTokenAddress,
      constructorArguments: ["Avail", "AVAIL"],
    });

    // Note: For proxied contracts, verify the implementation contract
    const implAddress = await upgrades.erc1967.getImplementationAddress(
      bridgeAddress
    );
    await hre.run("verify:verify", {
      address: implAddress,
      constructorArguments: [],
    });
  } catch (error) {
    console.log("Verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

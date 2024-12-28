import { utils, Wallet } from "zksync-ethers";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Upgrades } from "@openzeppelin/hardhat-upgrades";
import { Deployer } from "@matterlabs/hardhat-zksync";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Get environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const NEXUS_APP_ID = process.env.NEXUS_APP_ID_ZKSYNC1 || "";
const MAILBOX_ADDRESS = process.env.MAILBOX_ADDRESS_ZKSYNC_1 || "";

if (!PRIVATE_KEY || !NEXUS_APP_ID || !MAILBOX_ADDRESS) {
  throw new Error("Missing required environment variables");
}

async function main() {
  console.log(`Running deploy script for bridge contract`);

  // Initialize the wallet
  const wallet = new Wallet(PRIVATE_KEY);

  // Create deployer object
  const deployer = new Deployer(hre, wallet);

  // Deploy AvailToken contract
  console.log("Deploying ERC20Token contract...");
  const availTokenArtifact = await deployer.loadArtifact("ERC20Token");
  const availToken = await deployer.deploy(availTokenArtifact, [
    "Avail",
    "AVAIL",
  ]);
  const availTokenAddress = await availToken.getAddress();
  console.log(`ERC20Token deployed to: ${availTokenAddress}`);

  // Get deployer's public address
  const publicAddress = await wallet.getAddress();

  // Deploy Bridge Contract
  console.log("Deploying NexusBridge contract...");
  const bridgeArtifact = await deployer.loadArtifact("NexusLockMintBridge");
  const bridgeContract = await deployer.deploy(bridgeArtifact);
  await bridgeContract.initialize(
    publicAddress, // Fee collector
    availTokenAddress, // token
    publicAddress, // governance
    publicAddress, // pauser
    MAILBOX_ADDRESS
  );

  const bridgeAddress = await bridgeContract.getAddress();
  console.log(`NexusBridge contract deployed to: ${bridgeAddress}`);

  // Log deployment summary
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log(`ERC20Token: ${availTokenAddress}`);
  console.log(`NexusBridge: ${bridgeAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

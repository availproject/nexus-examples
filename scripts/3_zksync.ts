import { utils, Wallet } from "zksync-ethers";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync";

let app_id =
  "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26";

async function main() {
  console.log(`Running deploy script`);

  // Initialize the wallet.
  const wallet = new Wallet(
    "0x2d64990aa363e3d38ae3417950fd40801d75e3d3bd57b86d17fcc261a6c951c6"
  );

  // Create deployer object.
  const deployer = new Deployer(hre, wallet);

  // Deploy JellyfishMerkleTreeVerifier contract
  const jmtArtifact = await deployer.loadArtifact(
    "JellyfishMerkleTreeVerifier"
  );
  const jmt = await deployer.deploy(jmtArtifact);
  console.log(
    `JellyfishMerkleTreeVerifier deployed to ${await jmt.getAddress()}`
  );

  // Deploy NexusProofManager contract with the linked library
  const nexusArtifact = await deployer.loadArtifact("NexusProofManager");
  const nexusManager = await deployer.deploy(nexusArtifact, [app_id]);
  console.log(
    `NexusProofManager deployed to ${await nexusManager.getAddress()}`
  );

  // Deploy AvailToken contract
  const availTokenArtifact = await deployer.loadArtifact("ERC20Token");
  const availToken = await deployer.deploy(availTokenArtifact, [
    "Avail",
    "AVAIL",
  ]);
  console.log(`Avail Token deployed to ${await availToken.getAddress()}`);

  // Deploy MyNFT contract
  const myNFTArtifact = await deployer.loadArtifact("MyNFT");
  const nftContract = await deployer.deploy(myNFTArtifact, [
    stringToBytes32("137"),
    stringToBytes32("1337"),
    await nexusManager.getAddress(),
    ethers.ZeroAddress,
  ]);
  console.log(`NFT Contract deployed to ${await nftContract.getAddress()}`);

  // Deploy NFTPayment contract
  const paymentArtifact = await deployer.loadArtifact("NFTPayment");
  console.log(deployer.ethWallet.address);
  const paymentContract = await deployer.deploy(paymentArtifact, [
    await nexusManager.getAddress(),
    deployer.ethWallet.address,
    await nftContract.getAddress(),
  ]);
  console.log(
    `Payment contract deployed to ${await paymentContract.getAddress()}`
  );

  // Update target contract for the NFT contract
  await nftContract.updateTargetContract(await paymentContract.getAddress());

  // Log all contract addresses
  console.log("Payment contract:", await paymentContract.getAddress());
  console.log("NFT Contract:", await nftContract.getAddress());
  console.log("Avail Token:", await availToken.getAddress());
}

function stringToBytes32(str: string): string {
  const hex = Buffer.from(str, "utf8").toString("hex");
  const paddedHex = hex.padEnd(64, "0");
  return `0x${paddedHex}`;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

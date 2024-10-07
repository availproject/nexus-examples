import { utils, Wallet } from "zksync-ethers";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync";

let app_id =
  "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26";
let app_id_2 =
  "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26";
let nftContractAddress = "";
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

  // Deploy NexusProofManager contract with the linked library
  const nexusArtifact = await deployer.loadArtifact("NexusProofManager");
  const nexusManager = await deployer.deploy(nexusArtifact);
  console.log(
    `NexusProofManager deployed to ${await nexusManager.getAddress()}`
  );

  const mailboxArtifact = await deployer.loadArtifact("NexusMailbox");
  const mailbox = await deployer.deploy(mailboxArtifact);
  await mailbox.initialize(app_id);
  console.log("Mailbox deployed to ", await mailbox.getAddress());

  const ZKSyncDiamond = await deployer.loadArtifact("ZKSyncDiamond");
  const zksyncdiamond = await deployer.deploy(ZKSyncDiamond, [
    await nexusManager.getAddress(),
    app_id_2,
  ]);

  const SparseMerkleTree = await deployer.loadArtifact("SparseMerkleTree");
  const sparseMerkleTree = await deployer.deploy(SparseMerkleTree);

  const VerifierWrapper = await deployer.loadArtifact("VerifierWrapper");
  const verifierWrapper = await deployer.deploy(VerifierWrapper, [
    await zksyncdiamond.getAddress(),
    await sparseMerkleTree.getAddress(),
  ]);

  await mailbox.addOrUpdateWrapper(app_id, await verifierWrapper.getAddress());

  // Deploy NFTPayment contract
  const MyNFTArtifact = await deployer.loadArtifact("NFTPaymentMailbox");

  const MyNFTContract = await deployer.deploy(MyNFTArtifact, [
    await mailbox.getAddress(),
    app_id,
    nftContractAddress,
  ]);
  console.log(`NFT contract deployed to ${await MyNFTContract.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

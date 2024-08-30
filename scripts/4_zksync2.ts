import { ethers } from "hardhat";
import { ethers as eth } from "ethers";
import { nexusAppID, privateKeyZkSync2 } from "../off-chain/zknft/src/config";
import { Deployer } from "@matterlabs/hardhat-zksync";
import { utils, Wallet } from "zksync-ethers";
async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", signer.address);
  const wallet = new Wallet(privateKeyZkSync2);
  const deployer = new Deployer(hre, wallet);

  const NexusProofManager = await deployer.loadArtifact("NexusProofManager");
  const nexusManager = await deployer.deploy(NexusProofManager, [
    "0x" + nexusAppID,
  ]);

  console.log(
    "NexusProofManager deployed to:",
    await nexusManager.getAddress()
  );

  const ZKSyncDiamond = await deployer.loadArtifact("ZKSyncDiamond");
  const zksyncdiamond = await deployer.deploy(ZKSyncDiamond, [
    await nexusManager.getAddress(),
    "0x" + nexusAppID,
  ]);
  const SparseMerkleTree = await deployer.loadArtifact("SparseMerkleTree");
  const sparseMerkleTree = await deployer.deploy(SparseMerkleTree);

  const StorageProofVerifier = await deployer.loadArtifact(
    "StorageProofVerifier"
  );
  const storageProofVerifier = await deployer.deploy(StorageProofVerifier, [
    await zksyncdiamond.getAddress(),
    await sparseMerkleTree.getAddress(),
  ]);

  // console.log("Sparse Merkle Tree: ", await sparseMerkleTree.getAddress());
  // console.log("ZKSync Diamond Contract: ", await zksyncdiamond.getAddress());

  const MyNFT = await deployer.loadArtifact("MyNFT");
  const nftContract = await deployer.deploy(MyNFT, [
    stringToBytes32("137"),
    stringToBytes32("1337"),
    await nexusManager.getAddress(),
    await storageProofVerifier.getAddress(),
  ]);

  console.log("NFT Contract: ", await nftContract.getAddress());
}

function stringToBytes32(str: string): string {
  const hex = Buffer.from(str, "utf8").toString("hex");
  const paddedHex = hex.padEnd(64, "0");
  return `0x${paddedHex}`;
}

main();

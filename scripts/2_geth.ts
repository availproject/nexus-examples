import { ethers } from "hardhat";
import { ethers as eth } from "ethers";

let app_id =
  "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26";
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const JMT = await ethers.getContractFactory("JellyfishMerkleTreeVerifier");
  const jmt = await JMT.deploy();

  const NexusProofManager = await ethers.getContractFactory(
    "NexusProofManager",
    {
      libraries: {
        JellyfishMerkleTreeVerifier: await jmt.getAddress(),
      },
    }
  );
  const nexusManager = await NexusProofManager.deploy(app_id);

  console.log(
    "NexusProofManager deployed to:",
    await nexusManager.getAddress()
  );

  const AvailToken = await ethers.getContractFactory("ERC20Token");
  const availToken = await AvailToken.deploy("Avail", "AVAIL");

  console.log("Avail Token:", await availToken.getAddress());

  const ZKSyncDiamond = await ethers.getContractFactory("ZKSyncDiamond");
  const zksyncdiamond = await ZKSyncDiamond.deploy(
    await nexusManager.getAddress(),
    stringToBytes32("1337")
  );
  const SparseMerkleTree = await ethers.getContractFactory("SparseMerkleTree");
  const sparseMerkleTree = await SparseMerkleTree.deploy();

  const StorageProofVerifier = await ethers.getContractFactory(
    "StorageProofVerifier"
  );
  const storageProofVerifier = await StorageProofVerifier.deploy(
    await zksyncdiamond.getAddress(),
    await sparseMerkleTree.getAddress()
  );

  console.log("Sparse Merkle Tree: ", await sparseMerkleTree.getAddress());
  console.log("ZKSync Diamond Contract: ", await zksyncdiamond.getAddress());

  const MyNFT = await ethers.getContractFactory("MyNFT");
  const nftContract = await MyNFT.deploy(
    stringToBytes32("137"),
    stringToBytes32("1337"),
    await nexusManager.getAddress(),
    ethers.ZeroAddress
  );

  console.log("NFT Contract: ", await nftContract.getAddress());
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

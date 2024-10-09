import { ethers } from "hardhat";
import { ethers as eth } from "ethers";
import { nexusAppID, privateKeyZkSync2 } from "../off-chain/zknft/src/config";
import { Deployer } from "@matterlabs/hardhat-zksync";
import { utils, Wallet } from "zksync-ethers";

const nexusManagerAddress = "";
const storageProofVerifierAddress = "";
async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", signer.address);
  const wallet = new Wallet(privateKeyZkSync2);
  const deployer = new Deployer(hre, wallet);

  const MyNFT = await deployer.loadArtifact("MyNFT");
  const nftContract = await deployer.deploy(MyNFT, [
    stringToBytes32("137"),
    stringToBytes32("1337"),
    nexusManagerAddress,
    storageProofVerifierAddress,
  ]);

  console.log("NFT Contract: ", await nftContract.getAddress());
}

function stringToBytes32(str: string): string {
  const hex = Buffer.from(str, "utf8").toString("hex");
  const paddedHex = hex.padEnd(64, "0");
  return `0x${paddedHex}`;
}

main();

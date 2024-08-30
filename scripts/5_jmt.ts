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
  const JMT = await deployer.loadArtifact("JellyfishMerkleTreeVerifier");
  const jmt = await deployer.deploy(JMT);

  console.log("JMT", await jmt.getAddress());
}

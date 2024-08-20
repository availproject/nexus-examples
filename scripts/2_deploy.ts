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

  const MyNFT = await ethers.getContractFactory("MyNFT");
  const nftContract = await MyNFT.deploy(
    stringToBytes32("137"),
    stringToBytes32("1337"),
    await nexusManager.getAddress(),
    ethers.ZeroAddress
  );

  let signers = await ethers.getSigners();

  const Payment = await ethers.getContractFactory("NFTPayment");
  const paymentContract = await Payment.deploy(
    await nexusManager.getAddress(),
    await signers[3].getAddress(),
    await nftContract.getAddress()
  );

  await nftContract.updateTargetContract(await paymentContract.getAddress());

  console.log("Payment contract: ", await paymentContract.getAddress());
  console.log("NFT Contract: ", await nftContract.getAddress());
  console.log("ERC 20", await availToken.getAddress());
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

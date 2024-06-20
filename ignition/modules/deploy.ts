import hre, { ethers } from "hardhat";
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

  const Bridge = await ethers.getContractFactory("NexusBridge");
  const bridge = await Bridge.deploy();
  const address = await ethers.getSigners();

  const AvailToken = await ethers.getContractFactory("AvailToken");
  const availToken = await AvailToken.deploy();

  console.log("Bridge deployed to:", await bridge.getAddress());
  console.log("Avail Token:", await availToken.getAddress());

  await bridge.initialize(
    10,
    ethers.ZeroAddress,
    await availToken.getAddress(),
    address[0],
    address[0],
    await nexusManager.getAddress(),
    app_id
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

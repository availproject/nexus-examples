import { ethers } from "hardhat";
import { ethers as eth } from "ethers";
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
  const nexusManager = await NexusProofManager.deploy(
    ethers.zeroPadValue("0x1011", 32)
  );

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
    ethers.zeroPadValue("0x1011", 32)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

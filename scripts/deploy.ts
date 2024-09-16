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
  const nexusManager = await NexusProofManager.deploy();

  console.log(
    "NexusProofManager deployed to:",
    await nexusManager.getAddress()
  );

  const Bridge = await ethers.getContractFactory("NexusBridge");
  const bridge = await Bridge.deploy();
  const address = await ethers.getSigners();

  const AvailToken = await ethers.getContractFactory("ERC20Token");
  const availToken = await AvailToken.deploy("Avail", "AVAIL");

  console.log("Bridge deployed to:", await bridge.getAddress());
  console.log("Avail Token:", await availToken.getAddress());

  const EthereumVerifier = await ethers.getContractFactory("EthereumVerifier");
  const ethereumVerifier = await EthereumVerifier.deploy(
    await nexusManager.getAddress()
  );

  await bridge.initialize(
    10,
    ethers.ZeroAddress,
    await availToken.getAddress(),
    address[0],
    address[0],
    await nexusManager.getAddress(),
    app_id,
    await ethereumVerifier.getAddress()
  );

  // required only for destination chain
  const WETHToken = await ethers.getContractFactory("ERC20Token");
  const wethToken = await WETHToken.deploy("WETH", "WETH");
  console.log("WETH address: ", await wethToken.getAddress());

  const wethBytes32 = stringToBytes32("weth");
  console.log("Asset Id", wethBytes32);

  const eth = ethers.parseEther("100");
  await bridge.updateTokens([wethBytes32], [await wethToken.getAddress()]);
  await wethToken.mint(await bridge.getAddress(), eth);
  await wethToken.mint(address[0], eth);
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

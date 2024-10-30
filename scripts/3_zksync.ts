import { utils, Wallet } from "zksync-ethers";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync";

let app_id =
  "0x688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26";
let nexusStateManagerAddress = "";

async function main() {
  console.log(`Running deploy script`);

  // Initialize the wallet.
  const wallet = new Wallet(
    "0x2d64990aa363e3d38ae3417950fd40801d75e3d3bd57b86d17fcc261a6c951c6"
  );

  // Create deployer object.
  const deployer = new Deployer(hre, wallet);

  // Deploy AvailToken contract
  const availTokenArtifact = await deployer.loadArtifact("ERC20Token");
  const availToken = await deployer.deploy(availTokenArtifact, [
    "Avail",
    "AVAIL",
  ]);
  console.log(`Avail Token deployed to ${await availToken.getAddress()}`);

  // Deploy NFTPayment contract
  const paymentArtifact = await deployer.loadArtifact("NFTPayment");
  console.log(deployer.ethWallet.address);
  const paymentContract = await deployer.deploy(paymentArtifact, [
    nexusStateManagerAddress,
    deployer.ethWallet.address,
    ethers.ZeroAddress,
  ]);
  console.log(
    `Payment contract deployed to ${await paymentContract.getAddress()}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

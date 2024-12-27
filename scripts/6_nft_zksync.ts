import { utils, Wallet } from "zksync-ethers";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync";

let app_id =
  "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";
let app_id_2 =
  "0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d";
let mailBoxAddress = "0x210E7C834741eeb26922867bEe17470AAB0D85C4";
async function main() {
  console.log(`Running deploy script`);

  // Initialize the wallet.
  const wallet = new Wallet(
    "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6"
  );

  // Create deployer object.
  const deployer = new Deployer(hre, wallet);

  // Deploy NFTPayment contract
  const MyNFTArtifact = await deployer.loadArtifact("MyNFTMailbox");

  const MyNFTContract = await deployer.deploy(MyNFTArtifact, [
    app_id,
    app_id_2,
    mailBoxAddress,
  ]);

  console.log(`NFT contract deployed to ${await MyNFTContract.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

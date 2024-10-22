import { utils, Wallet } from "zksync-ethers";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync";

let app_id =
  "0x3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d";
let app_id_2 =
  "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";
let nftContractAddress = "0xfcC66069D2046dF3cA36Ae56B3E64eC5CDd48eD4";
let mailBoxAddress = "0x5B64Faa481CBacdE68F1668fE51802e1b420f9f6";

async function main() {
  console.log(`Running deploy script`);

  // Initialize the wallet.
  const wallet = new Wallet(
    "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6"
  );
  console.log(wallet.getAddress(), wallet.provider);

  // Create deployer object.
  const deployer = new Deployer(hre, wallet);

  // Deploy NFTPayment contract
  const MyNFTArtifact = await deployer.loadArtifact("NFTPaymentMailbox");
  console.log("Loaded NFTPayment artifact");
  const MyNFTContract = await deployer.deploy(MyNFTArtifact, [
    mailBoxAddress,
    app_id,
    nftContractAddress,
  ]);
  console.log(`NFT contract deployed to ${await MyNFTContract.getAddress()}`);

  // Deploy Token contract
  const TokenArtifact = await deployer.loadArtifact("Token");
  console.log("Loaded Token artifact");

  // Initial supply for the token (in smallest units, like 1000 tokens * 10^18 for 18 decimals)
  const initialSupply = ethers.parseUnits("1000", 18).toString();  // Adjust the supply as needed

  const TokenContract = await deployer.deploy(TokenArtifact, [initialSupply]);
  console.log(`Token contract deployed to ${await TokenContract.getAddress()}`);

  console.log(`Token deployed with initial supply sent to ${await wallet.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

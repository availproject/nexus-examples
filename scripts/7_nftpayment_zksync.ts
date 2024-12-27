import { utils, Wallet } from "zksync-ethers";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync";

let app_id =
  "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";
let app_id_2 =
  "0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d";
let nftContractAddress = "0xed96D8c63c173dE735376d7bbC614295c07Dc195";
let mailBoxAddress = "0x229357479712C1B364C8574c05E7c0a1CD85CAEd";

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

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@foundry-rs/hardhat-anvil";
import "@matterlabs/hardhat-zksync";
// import "@openzeppelin/hardhat-upgrades";

import dotenv from "dotenv";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-foundry";
import { Wallet } from "zksync-ethers";
import * as ethers from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync";
import { promises as fs } from "fs";
import path from "path";

dotenv.config();

task("6_nft_zksync", "Deploys NFT contract on zkSync")
  .addParam("mailbox", "The mailbox address")
  .setAction(async (taskArgs, hre) => {
    const { mailbox } = taskArgs;
    const mailBoxAddress = mailbox;
    const app_id =
      "0x3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d";
    const app_id_2 =
      "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";

    const wallet = new Wallet(process.env.PRIVATE_KEY || "");

    const deployer = new Deployer(hre, wallet);
    const MyNFTArtifact = await deployer.loadArtifact("MyNFTMailbox");

    const MyNFTContract = await deployer.deploy(MyNFTArtifact, [
      app_id,
      app_id_2,
      mailBoxAddress,
    ]);

    const myNFTMailboxABI = MyNFTArtifact.abi;
    await saveABI("MyNFTMailbox", myNFTMailboxABI);

    const nftContractAddress = await MyNFTContract.getAddress();
    console.log(
      JSON.stringify({
        nftContractAddress: nftContractAddress,
      })
    );

    // Save the contract address in output for later use
    return nftContractAddress;
  });

task("7_nftpayment_zksync", "Deploys NFT payment contract on zkSync")
  .addParam("mailbox", "The mailbox address")
  .addParam("nft", "The NFT contract address")
  .setAction(async (taskArgs, hre) => {
    const { mailbox, nft } = taskArgs;

    const app_id =
      "0x3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d";
    const app_id_2 =
      "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";

    const wallet = new Wallet(process.env.PRIVATE_KEY || "");

    const deployer = new Deployer(hre, wallet);

    // Deploy NFT Payment contract
    const MyNFTPaymentArtifact = await deployer.loadArtifact(
      "NFTPaymentMailbox"
    );
    const MyNFTPaymentContract = await deployer.deploy(MyNFTPaymentArtifact, [
      mailbox,
      app_id,
      nft,
    ]);

    const nftPaymentContractAddress = await MyNFTPaymentContract.getAddress();
    const nftPaymentABI = MyNFTPaymentArtifact.abi;
    await saveABI("NFTPaymentMailbox", nftPaymentABI);

    // Deploy Token contract
    const TokenArtifact = await deployer.loadArtifact("Token");
    const initialSupply = ethers.parseEther("1000").toString();
    const TokenContract = await deployer.deploy(TokenArtifact, [initialSupply]);

    const tokenContractAddress = await TokenContract.getAddress();
    const erc20ABI = TokenArtifact.abi;
    await saveABI("MyERC20Token", erc20ABI);

    // Print both addresses in JSON format
    console.log(
      JSON.stringify({
        nftPaymentContractAddress: nftPaymentContractAddress,
        tokenContractAddress: tokenContractAddress,
      })
    );
  });

async function saveABI(contractName: string, abi: any) {
  const abiDir = path.resolve(__dirname, "off-chain/zknft-mailbox/abi");
  await fs.mkdir(abiDir, { recursive: true });

  const abiFilePath = path.join(abiDir, `${contractName}.json`);
  await fs.writeFile(abiFilePath, JSON.stringify(abi, null, 2));
}

const config: HardhatUserConfig = {
  zksolc: {
    version: "latest",
  },
  solidity: {
    version: "0.8.21",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
      zksync: false,
    },
    sepolia: {
      chainId: 11155111,
      url: "https://eth-sepolia.g.alchemy.com/v2/_KqnP0lxGATLR7FdSiEfGspMvQTAtsOF",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      ],
      zksync: false,
    },
    node: {
      chainId: 1337,
      url: "http://127.0.0.1:3100",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      ],
      zksync: false,
    },
    node2: {
      chainId: 1338,
      url: "http://zksync1.nexus.avail.tools",
      zksync: false,
    },
    zksync2: {
      url: "http://zksync2.nexus.avail.tools",
      ethNetwork: "sepolia",
      accounts: [
        "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6",
      ],
      zksync: true,
    },
    zksync: {
      url: "http://zksync1.nexus.avail.tools",
      ethNetwork: "sepolia",
      accounts: [
        "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6",
      ],
      zksync: true,
    },
  },
  etherscan: {
    apiKey: "R6ZVEDEQPPKYNVZKT5IMPBEGHU2DD7D5A4",
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true,
  },
};

export default config;

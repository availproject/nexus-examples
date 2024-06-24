import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@foundry-rs/hardhat-anvil";
import dotenv from "dotenv";
import { vars } from "hardhat/config";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-foundry";
dotenv.config();

const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    node: {
      chainId: 1337,
      url: "http://127.0.0.1:8545",
    },
    node2: {
      chainId: 1338,
      url: "http://127.0.0.1:8546",
    },
    arbitrum: {
      url: process.env.RPC_PROVIDER_ORIGIN,
      accounts: [process.env.ARB_PRIVATE_KEY || ""],
    },
    polygonZKEvm: {
      url: process.env.RPC_PROVIDER_DESTINATION,
      accounts: [process.env.POLYGON_ZKEVM_CARDONA || ""],
    },
  },
  etherscan: {
    apiKey: "IIRQ3N1AQXTTTJW9K7HFSA6WAZV25CKCSP",
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true,
  },
};

export default config;

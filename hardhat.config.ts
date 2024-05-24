import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@foundry-rs/hardhat-anvil";
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.19",
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
  },
};

export default config;

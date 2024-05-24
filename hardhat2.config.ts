import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat2: {
      chainId: 1338,
      url: "http://127.0.0.1:8547",
    },
  },
};

export default config;

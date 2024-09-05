import { ethers } from "ethers";
import contractsConfig from "./contracts_config.json";

export const stateManagerNFTChainAddr = contractsConfig.stateManagerNFTChainAddr
  ? contractsConfig.stateManagerNFTChainAddr
  : "0xd0FD2c20e2f2Ee5F3D7A03abB5F8557BA73e888A";
export const storageNFTChainAddress = contractsConfig.storageNFTChainAddress
  ? contractsConfig.storageNFTChainAddress
  : "0x6db09Fd22Fab0CCDa6c443aFc861c9515F7632bf";
export const paymentTokenAddr = contractsConfig.paymentTokenAddr
  ? contractsConfig.paymentTokenAddr
  : "0x3F015117432f4E2e970D3B6b918F3B92D17eFC88";
export const paymentContractAddress = contractsConfig.paymentContractAddress
  ? contractsConfig.paymentContractAddress
  : "0x9C8475A3f11720F016639779BEf4BD5eA214EF63";

export const paymentZKSyncProviderURL = "http://0.0.0.0:3050";
export const nftMintProviderURL = "http://0.0.0.0:4050";
export const nexusRPCUrl = "http://127.0.0.1:7000";
export const nexusAppID =
  "3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d";
export const privateKeyZkSync =
  "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
export const privateKeyZkSync2 =
  "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";

export const amount = ethers.toBigInt("1000000000000000000");

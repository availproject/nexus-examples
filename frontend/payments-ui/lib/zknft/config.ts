import contractsConfig from "./contracts_config.json"
export const stateManagerNFTChainAddr =
  contractsConfig.proofManagerAddress1 ? contractsConfig.proofManagerAddress1 : "";
export const storageNFTChainAddress =
  contractsConfig.nftContractAddress ? contractsConfig.nftContractAddress : "";
export const paymentTokenAddr = contractsConfig.tokenContractAddress ? contractsConfig.tokenContractAddress : "";
export const paymentContractAddress = contractsConfig.nftPaymentContractAddress ? contractsConfig.nftPaymentContractAddress :
  "";
export const nftContractAddress = contractsConfig.nftContractAddress ? contractsConfig.nftContractAddress : "";
export const paymentZKSyncProviderURL = "https://zksync2.nexus.avail.tools";
export const nftMintProviderURL = "https://zksync1.nexus.avail.tools";
export const nexusRPCUrl = "https://dev.nexus.avail.tools";
export const nexusAppID =
  "3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d";
export const privateKeyZkSync =
  "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
export const privateKeyZkSync2 =
  "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
export const paymentURL = process.env.NEXT_PUBLIC_PAYMENT_URL || "http://localhost:3001";
export const paymentChainId = 272;

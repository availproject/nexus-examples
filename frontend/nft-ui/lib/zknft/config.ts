import contractsConfig from "./contracts_config.json"

export const stateManagerNFTChainAddr =
  contractsConfig.proofManagerAddress2 ? contractsConfig.proofManagerAddress2 : "0xd0FD2c20e2f2Ee5F3D7A03abB5F8557BA73e888A";
export const storageNFTChainAddress =
  contractsConfig.nftContractAddress ? contractsConfig.nftContractAddress : "0x6db09Fd22Fab0CCDa6c443aFc861c9515F7632bf";
export const paymentTokenAddr = contractsConfig.tokenContractAddress ? contractsConfig.tokenContractAddress : "0x3F015117432f4E2e970D3B6b918F3B92D17eFC88";
export const paymentContractAddress = contractsConfig.nftPaymentContractAddress ? contractsConfig.nftPaymentContractAddress :
  "0x9C8475A3f11720F016639779BEf4BD5eA214EF63";
export const nftContractAddress = contractsConfig.nftContractAddress ? contractsConfig.nftContractAddress : "0x3F015117432f4E2e970D3B6b918F3B92D17eFC88";
export const paymentZKSyncProviderURL = "http://zksync1.nexus.avail.tools";
export const nftMintProviderURL = "http://zksync2.nexus.avail.tools";
export const nexusRPCUrl = "http://dev.nexus.avail.tools";
export const nexusAppID =
  "3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d";
export const privateKeyZkSync =
  "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
export const privateKeyZkSync2 =
  "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
export const paymentURL = "http://localhost:3001";

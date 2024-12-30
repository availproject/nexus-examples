import contractsConfig from "./contracts_config.json"

export const stateManagerNFTChainAddr =
  contractsConfig.proofManagerAddress2 ? contractsConfig.proofManagerAddress1 : "0xd0FD2c20e2f2Ee5F3D7A03abB5F8557BA73e888A";
export const stateManagerPaymentChainAddr =
  contractsConfig.proofManagerAddress1 ? contractsConfig.proofManagerAddress2 : "0xd0FD2c20e2f2Ee5F3D7A03abB5F8557BA73e888A";
export const storageNFTChainAddress =
  contractsConfig.nftContractAddress ? contractsConfig.nftContractAddress : "0x6db09Fd22Fab0CCDa6c443aFc861c9515F7632bf";
export const paymentTokenAddr = contractsConfig.tokenContractAddress ? contractsConfig.tokenContractAddress : "0x3F015117432f4E2e970D3B6b918F3B92D17eFC88";
export const paymentContractAddress = contractsConfig.nftPaymentContractAddress ? contractsConfig.nftPaymentContractAddress :
  "0x9C8475A3f11720F016639779BEf4BD5eA214EF63";
export const nftContractAddress = contractsConfig.nftContractAddress ? contractsConfig.nftContractAddress : "0x3F015117432f4E2e970D3B6b918F3B92D17eFC88";
export const nftChainMailboxAddress =
  contractsConfig.mailBoxAddress1 ? contractsConfig.mailBoxAddress1 : "0x7C08869E8EBf91f43B8293E707D4e6918d95a06c";
export const paymentChainMailboxAddress =
  contractsConfig.mailBoxAddress2 ? contractsConfig.mailBoxAddress2 : "0x7C08869E8EBf91f43B8293E707D4e6918d95a06c";
export const paymentZKSyncProviderURL = "https://zksync1.nexus.avail.tools";
export const nftMintProviderURL = "https://zksync2.nexus.avail.tools";
export const nexusRPCUrl = "https://dev.nexus.avail.tools";
export const nexusAppID =
  "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";
export const nexusAppIDPayment =
  "0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d";
export const privateKeyZkSync =
  "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
export const privateKeyZkSync2 =
  "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
export const paymentURL = "http://localhost:3001";

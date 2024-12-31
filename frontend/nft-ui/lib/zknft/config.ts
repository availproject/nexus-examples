import contractsConfig from "./contracts_config.json"

export const stateManagerNFTChainAddr =
  contractsConfig.proofManagerAddress1 ? contractsConfig.proofManagerAddress1 : "";
export const stateManagerPaymentChainAddr =
  contractsConfig.proofManagerAddress2 ? contractsConfig.proofManagerAddress2 : "";
export const storageNFTChainAddress =
  contractsConfig.nftContractAddress ? contractsConfig.nftContractAddress : "";
export const paymentTokenAddr = contractsConfig.tokenContractAddress ? contractsConfig.tokenContractAddress : "";
export const paymentContractAddress = contractsConfig.nftPaymentContractAddress ? contractsConfig.nftPaymentContractAddress :
  "";
export const nftContractAddress = contractsConfig.nftContractAddress ? contractsConfig.nftContractAddress : "";
export const nftChainMailboxAddress =
  contractsConfig.mailBoxAddress1 ? contractsConfig.mailBoxAddress1 : "";
export const paymentChainMailboxAddress =
  contractsConfig.mailBoxAddress2 ? contractsConfig.mailBoxAddress2 : "";
export const paymentZKSyncProviderURL = "https://zksync2.nexus.avail.tools";
export const nftMintProviderURL = "https://zksync1.nexus.avail.tools";
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.amount = exports.nexusAppID = exports.nexusRPCUrl = exports.nftMintProviderURL = exports.paymentZKSyncProviderURL = exports.paymentContractAddress = exports.paymentTokenAddr = exports.diamondAddress = exports.storageNFTChainAddress = exports.stateManagerNFTChainAddr = void 0;
const ethers_1 = require("ethers");
exports.stateManagerNFTChainAddr = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";
exports.storageNFTChainAddress = "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d";
exports.diamondAddress = "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE";
exports.paymentTokenAddr = "0x91de3bFE8594DC2d9032c642786E10273a64BA0C";
exports.paymentContractAddress = "0xb792744f96Aa684C77cCea32208B33B07672dF44";
exports.paymentZKSyncProviderURL = "0.0.0.0:3050";
exports.nftMintProviderURL = "0.0.0.0:3100";
exports.nexusRPCUrl = "";
exports.nexusAppID = ethers_1.ethers.sha256(ethers_1.ethers.toUtf8Bytes("100"));
exports.amount = 1000000000000000000;
// zksync
// JellyfishMerkleTreeVerifier deployed to 0x0B0E86d6242201B163412F0239a18A0ea02b60CB
// NexusProofManager deployed to 0x9B128e90689468428cDB98d8D44d75355A2eEaC5
// Avail Token deployed to 0x91de3bFE8594DC2d9032c642786E10273a64BA0C
// Payment contract deployed to 0xb792744f96Aa684C77cCea32208B33B07672dF44
// Payment contract: 0xb792744f96Aa684C77cCea32208B33B07672dF44
// Avail Token: 0x91de3bFE8594DC2d9032c642786E10273a64BA0C
// geth
// Deploying contracts with the account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
// NexusProofManager deployed to: 0x0B306BF915C4d645ff596e518fAf3F9669b97016
// Avail Token: 0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1
// Sparse Merkle Tree:  0x68B1D87F95878fE05B998F19b66F4baba5De1aed
// ZKSync Diamond Contract:  0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE
// NFT Contract:  0xc6e7DF5E7b4f2A278906862b61205850344D4e7d

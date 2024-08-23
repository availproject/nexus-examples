"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SepoliaStorageProofProvider = exports.MainnetStorageProofProvider = exports.StorageProofProvider = void 0;
const ethers_1 = require("ethers");
const zksync_ethers_1 = require("zksync-ethers");
const interfaces_1 = require("./interfaces");
/** Omits batch hash from stored batch info */
const formatStoredBatchInfo = (batchInfo) => {
    const { batchHash } = batchInfo, metadata = __rest(batchInfo, ["batchHash"]);
    return metadata;
};
/** Storage proof provider for zkSync */
class StorageProofProvider {
    constructor(l1Provider, l2Provider, diamondAddress, verifierAddress) {
        this.l1Provider = l1Provider;
        this.l2Provider = l2Provider;
        this.diamondAddress = diamondAddress;
        this.verifierAddress = verifierAddress;
        /**
          Estimation of difference between latest L2 batch and latest verified L1
          batch. Assuming a 30 hour delay, divided to 12 minutes per block.
        */
        this.BLOCK_QUERY_OFFSET = 150;
        this.diamondContract = new ethers_1.Contract(diamondAddress, interfaces_1.ZKSYNC_DIAMOND_INTERFACE, l1Provider);
    }
    /** Updates L1 provider */
    setL1Provider(provider) {
        this.l1Provider = provider;
        this.diamondContract = new ethers_1.Contract(this.diamondAddress, interfaces_1.ZKSYNC_DIAMOND_INTERFACE, provider);
    }
    /** Updates L2 provider */
    setL2Provider(provider) {
        this.l2Provider = provider;
    }
    /** Returns logs root hash stored in L1 contract */
    getL2LogsRootHash(batchNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const l2RootsHash = yield this.diamondContract.l2LogsRootHash(batchNumber);
            return String(l2RootsHash);
        });
    }
    /** Returns ZkSync proof response */
    getL2Proof(account, storageKeys, batchNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Account proofs don't exist in zkSync, so we're only using storage proofs
                const { storageProof: storageProofs } = yield this.l2Provider.send("zks_getProof", [account, storageKeys, batchNumber]);
                return storageProofs.map((storageProof) => {
                    const { proof } = storageProof, rest = __rest(storageProof, ["proof"]);
                    return Object.assign({ account, path: proof }, rest);
                });
            }
            catch (e) {
                throw new Error(`Failed to get proof from L2 provider, ${e}`);
            }
        });
    }
    /** Parses the transaction where batch is committed and returns commit info */
    parseCommitTransaction(txHash, batchNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const transactionData = yield this.l1Provider.getTransaction(txHash);
            const [, , newBatch] = interfaces_1.ZKSYNC_DIAMOND_INTERFACE.decodeFunctionData("commitBatchesSharedBridge", transactionData.data);
            // Find the batch with matching number
            const batch = newBatch.find((batch) => {
                return batch[0] === BigInt(batchNumber);
            });
            if (batch == undefined) {
                throw new Error(`Batch ${batchNumber} not found in calldata`);
            }
            const commitBatchInfo = {
                batchNumber: batch[0],
                timestamp: batch[1],
                indexRepeatedStorageChanges: batch[2],
                newStateRoot: batch[3],
                numberOfLayer1Txs: batch[4],
                priorityOperationsHash: batch[5],
                bootloaderHeapInitialContentsHash: batch[6],
                eventsQueueStateHash: batch[7],
                systemLogs: batch[8],
                totalL2ToL1Pubdata: batch[9],
            };
            const receipt = yield this.l1Provider.getTransactionReceipt(txHash);
            if (receipt == undefined) {
                throw new Error(`Receipt for commit tx ${txHash} not found`);
            }
            // Parse event logs of the transaction to find commitment
            const blockCommitFilter = interfaces_1.ZKSYNC_DIAMOND_INTERFACE.encodeFilterTopics("BlockCommit", [batchNumber]);
            const commitLog = receipt.logs.find((log) => log.address === this.diamondAddress &&
                blockCommitFilter.every((topic, i) => topic === log.topics[i]));
            if (commitLog == undefined) {
                throw new Error(`Commit log for batch ${batchNumber} not found`);
            }
            const { commitment } = interfaces_1.ZKSYNC_DIAMOND_INTERFACE.decodeEventLog("BlockCommit", commitLog.data, commitLog.topics);
            return { commitBatchInfo, commitment };
        });
    }
    /**
     * Returns the stored batch info for the given batch number.
     * Returns null if the batch is not stored.
     * @param batchNumber
     */
    getStoredBatchInfo(batchNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const { commitTxHash, proveTxHash } = yield this.l2Provider.getL1BatchDetails(batchNumber);
            // If batch is not committed or proved, return null
            if (commitTxHash == undefined) {
                throw new Error(`Batch ${batchNumber} is not committed`);
            }
            else if (proveTxHash == undefined) {
                throw new Error(`Batch ${batchNumber} is not proved`);
            }
            // Parse commit calldata from commit transaction
            const { commitBatchInfo, commitment } = yield this.parseCommitTransaction(commitTxHash, batchNumber);
            const l2LogsTreeRoot = yield this.getL2LogsRootHash(batchNumber);
            const storedBatchInfo = {
                batchNumber: commitBatchInfo.batchNumber,
                batchHash: commitBatchInfo.newStateRoot,
                indexRepeatedStorageChanges: commitBatchInfo.indexRepeatedStorageChanges,
                numberOfLayer1Txs: commitBatchInfo.numberOfLayer1Txs,
                priorityOperationsHash: commitBatchInfo.priorityOperationsHash,
                l2LogsTreeRoot,
                timestamp: commitBatchInfo.timestamp,
                commitment,
            };
            return storedBatchInfo;
        });
    }
    verifyOnChain(proof) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.verifierAddress == undefined) {
                throw new Error("Verifier address is not provided");
            }
            const { metadata, account, key, path, value, index } = proof;
            const verifierContract = new ethers_1.Contract(this.verifierAddress, interfaces_1.STORAGE_VERIFIER_INTERFACE, this.l1Provider);
            return yield verifierContract.verify({
                metadata,
                account,
                key,
                path,
                value,
                index,
            });
        });
    }
    /**
     * Gets the proof and related data for the given batch number, address and storage keys.
     * @param address
     * @param storageKeys
     * @param batchNumber
     * @returns
     */
    getProofs(address, storageKeys, batchNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            // If batch number is not provided, get the latest batch number
            if (batchNumber == undefined) {
                const latestBatchNumber = yield this.l2Provider.getL1BatchNumber();
                batchNumber = latestBatchNumber - this.BLOCK_QUERY_OFFSET;
            }
            const proofs = yield this.getL2Proof(address, storageKeys, batchNumber);
            const metadata = yield this.getStoredBatchInfo(batchNumber).then(formatStoredBatchInfo);
            return { metadata, proofs };
        });
    }
    /**
     * Gets a single proof
     * @param address
     * @param storageKey
     * @param batchNumber
     * @returns
     */
    getProof(address, storageKey, batchNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const { metadata, proofs } = yield this.getProofs(address, [storageKey], batchNumber);
            return Object.assign({ metadata }, proofs[0]);
        });
    }
}
exports.StorageProofProvider = StorageProofProvider;
exports.MainnetStorageProofProvider = new StorageProofProvider(new ethers_1.JsonRpcProvider("https://eth.llamarpc.com"), new zksync_ethers_1.Provider("https://mainnet.era.zksync.io"), "0x32400084C286CF3E17e7B677ea9583e60a000324");
exports.SepoliaStorageProofProvider = new StorageProofProvider(new ethers_1.JsonRpcProvider("https://ethereum-sepolia.publicnode.com"), new zksync_ethers_1.Provider("https://sepolia.era.zksync.dev"), "0x9A6DE0f62Aa270A8bCB1e2610078650D539B1Ef9", "0x5490D0FE20E9F93a847c1907f7Fd2adF217bF534");
__exportStar(require("./types"), exports);

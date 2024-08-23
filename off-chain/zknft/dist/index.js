"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = __importDefault(require("ethers"));
const zksync_ethers_1 = require("zksync-ethers");
const nexusStateManager_json_1 = __importDefault(require("./nexusStateManager.json"));
const nft_json_1 = __importDefault(require("./nft.json"));
const payment_json_1 = __importDefault(require("./payment.json"));
const erc20_json_1 = __importDefault(require("./erc20.json"));
const zksyncDiamond_json_1 = __importDefault(require("./zksyncDiamond.json"));
const storageManager_1 = require("./storageManager");
const axios_1 = __importDefault(require("axios"));
let nftAddress = "";
let storageNFTChainAddress = "";
let paymentTokenAddr = "";
let paymentContractAddress = "";
let diamondAddress = "";
let paymentZKSyncProviderURL = "";
let nftMintProviderURL = "";
let nexusRPCUrl = "";
let nexusAppID = "688e94a51ee508a95e761294afb7a6004b432c15d9890c80ddf23bde8caa4c26";
let amount = 1000000000000000000;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. setup contracts across two chains
        let providerPayment = new zksync_ethers_1.Provider(paymentZKSyncProviderURL);
        let providerNFT = new ethers_1.default.JsonRpcProvider(nftMintProviderURL);
        let signerPayment = yield providerPayment.getSigner();
        let signerNFT = yield providerNFT.getSigner();
        const stateManagerNFTChain = new ethers_1.default.Contract(nftAddress, nexusStateManager_json_1.default, providerNFT);
        const storageNFTChain = new ethers_1.default.Contract(storageNFTChainAddress, nft_json_1.default, providerNFT);
        const paymentContract = new ethers_1.default.Contract(paymentContractAddress, payment_json_1.default, providerPayment);
        const paymentToken = new ethers_1.default.Contract(paymentTokenAddr, erc20_json_1.default, providerPayment);
        const zkSyncDiamond = new ethers_1.default.Contract(diamondAddress, zksyncDiamond_json_1.default, providerPayment);
        // 2. send payment on one chain ( payment chain )
        yield sendPayment(paymentContract, paymentToken, signerPayment);
        let batchNumber = yield fetchUpdatesFromNexus();
        // 3. get storage proof on the given chain
        yield getStorageProof(providerNFT, providerPayment, paymentContract, zkSyncDiamond, batchNumber);
        // 4. update nexus state for the chain
        yield updateNexusState();
        // 5. provide the storage proof and get the nft on target chain
        yield mintNFT();
    });
}
function fetchUpdatesFromNexus() {
    return __awaiter(this, void 0, void 0, function* () {
        let response = yield axios_1.default.get(nexusRPCUrl, {
            params: {
                app_account_id: nexusAppID,
            },
        });
        console.log(response.data);
        return response.data.batchNumber;
    });
}
function sendPayment(paymentContract, paymentToken, signer) {
    return __awaiter(this, void 0, void 0, function* () {
        paymentToken.mint(yield signer.getAddress(), 2 * amount);
        paymentToken.approve(yield paymentContract.getAddress(), 2 * amount);
        yield paymentContract.paymentWithoutFallback("0x01", 137, amount, yield paymentToken.getAddress());
    });
}
function getStorageProof(l1Provider, l2Provider, paymentContract, diamondContract, batchNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        let storageProofProvider = new storageManager_1.StorageProofProvider(l1Provider, l2Provider, yield diamondContract.getAddress() // not relevant for us
        );
        let slot = "";
        storageProofProvider.getProof(yield paymentContract.getAddress(), slot, batchNumber);
    });
}
function updateNexusState() {
    return __awaiter(this, void 0, void 0, function* () { });
}
function mintNFT() {
    return __awaiter(this, void 0, void 0, function* () { });
}
main();

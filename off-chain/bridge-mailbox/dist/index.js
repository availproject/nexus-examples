import { ethers, } from "ethers";
import { Provider as L2Provider } from "zksync-ethers";
import { NexusClient, ProofManagerClient, ZKSyncVerifier, } from "nexus-js";
import { Networks, } from "nexus-js";
import { getStorageLocationForReceipt } from "nexus-js";
import { ErrorDecoder } from "ethers-decode-error";
import BridgeABI from "./abi/bridge.json" with { type: "json" };
import ERC20Abi from "./abi/MyERC20Token.json" with { type: "json" };
import mailboxAbi from "./abi/mailbox.json" with { type: "json" };
import { sleep } from "zksync-ethers/build/utils.js";
// ZKSYNC 1
// NexusProofManager deployed to:  0xaaA07C6575E855AA279Ba04B63E8C5ee7FBc5908
// Mailbox deployed to:  0x9a03a545A60263216c4310Be05C34B71C170903A
// Verifer deployed to :  0xF2D362D78d8d2990EBd2d2FDCd77A0edBA840540
// ZKSYNC 2
// NexusProofManager deployed to:  0x19CC70262bc3337Ebd21750125d725546e1E0982
// Mailbox deployed to:  0x96A52A4dAcf9Cf7c07C6af08Ecf892ec009ea5aa
// Verifer deployed to :  0xA86Ff6e80D789AdAF7374A6A0e98787981719e35
const NexusBridgeZKSYNC1 = "0x74040d76894401D697750509ac0Ac5Dd0BAf1a93";
const ERC20TokenZKSYNC1 = "0x44c92F289Ce0be8c8dBB59d51bC2c6485ebF8DFB";
const NexusBridgeZKSYNC2 = "0xdED0afd11372a9c3c3aa40Ba6080879bB740DF49";
const zksyncVerifierAddress2 = "0xA86Ff6e80D789AdAF7374A6A0e98787981719e35";
const ERC20TokenZKSYNC2 = "0xD464c2d2B354D97AFBCC8a04096212b1483Ff065";
const mailboxAddressZKSYNC1 = "0x9a03a545A60263216c4310Be05C34B71C170903A";
const mailboxAddressZKSYNC2 = "0x96A52A4dAcf9Cf7c07C6af08Ecf892ec009ea5aa";
const proofManagerAddressZKSYNC1 = "0xaaA07C6575E855AA279Ba04B63E8C5ee7FBc5908";
const proofManagerAddressZKSYNC2 = "0x19CC70262bc3337Ebd21750125d725546e1E0982";
const privateKey = "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
const zksync1URL = "https://zksync1.nexus.avail.tools";
const zksync2URL = "https://zksync2.nexus.avail.tools";
const nexusRPCUrl = "http://dev.nexus.avail.tools";
const nonce = 3;
const appId1 = "0x1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";
const appId2 = "0x31b8a7e9f916616a8ed5eb471a36e018195c319600cbd3bbe726d1c96f03568d";
async function main() {
    console.log("🚀 Starting the process...");
    // 1. Lock money on one chain. Send message to mailbox
    console.log("🔒 Locking money on ZKSYNC1...");
    const zksync1Provider = new L2Provider(zksync1URL);
    const zksync2Provider = new L2Provider(zksync2URL);
    const signerZKSYNC1 = new ethers.Wallet(privateKey, zksync1Provider);
    const signerZKSYNC2 = new ethers.Wallet(privateKey, zksync2Provider);
    const bridgeContractZKSYNC1 = new ethers.Contract(NexusBridgeZKSYNC1, BridgeABI.abi, signerZKSYNC1);
    const bridgeContractZKSYNC2 = new ethers.Contract(NexusBridgeZKSYNC2, BridgeABI.abi, signerZKSYNC2);
    const erc20TokenZKSYNC1Contract = new ethers.Contract(ERC20TokenZKSYNC1, ERC20Abi, signerZKSYNC1);
    const lockAmount = ethers.parseEther("1");
    // Lock ETH
    await erc20TokenZKSYNC1Contract.mint(signerZKSYNC1.address, ethers.parseEther("10"));
    await erc20TokenZKSYNC1Contract.approve(bridgeContractZKSYNC1, lockAmount);
    const assetId = ethers.zeroPadValue(ethers.toBeHex(1), 32);
    await bridgeContractZKSYNC1.updateNexusTokens([assetId], [await erc20TokenZKSYNC1Contract.getAddress()]);
    console.log("💸 Sending ERC20 tokens...");
    let receiptHash = "0x";
    let blockNumber = 0;
    try {
        const balance = await erc20TokenZKSYNC1Contract.balanceOf(signerZKSYNC1.address);
        const tx = await bridgeContractZKSYNC1.sendERC20(assetId, ethers.zeroPadValue(ethers.toBeHex(signerZKSYNC1.address), 32), lockAmount, [appId2], nonce, [await bridgeContractZKSYNC2.getAddress()]);
        const receipt = await tx.wait();
        blockNumber = receipt.blockNumber;
        const abi = [
            "event MailboxEvent(bytes32 indexed nexusAppIDFrom,bytes32[] nexusAppIDTo,bytes data,address indexed from,address[] to,uint256 nonce,bytes32 receiptHash)"
        ];
        const eventInterface = new ethers.Interface(abi);
        for (const log of receipt.logs) {
            try {
                const decodedLog = eventInterface.decodeEventLog("MailboxEvent", log.data, log.topics);
                receiptHash = decodedLog.receiptHash;
                break;
            }
            catch (err) {
                continue;
            }
        }
        console.log("✅ Successfully sent ERC20 tokens");
    }
    catch (error) {
        console.error("❌ Error sending ERC20 tokens:", error);
        throw error;
    }
    // 2. Fetch storage proof from zksync1
    console.log("🔍 Fetching storage proof from ZKSYNC1...");
    const proofManagerClient = new ProofManagerClient(proofManagerAddressZKSYNC2, zksync2URL, privateKey);
    const zksync1NexusClient = new NexusClient(nexusRPCUrl, appId1);
    const accountDetails = await waitForUpdateOnNexus(zksync1NexusClient, blockNumber);
    console.log("ℹ️ Account details:", accountDetails);
    await proofManagerClient.updateNexusBlock(accountDetails.response.nexus_header.number, `0x${accountDetails.response.nexus_header.state_root}`, 
    //TODO: To be replaced by hash of nexus header.
    `0x${accountDetails.response.nexus_header.avail_header_hash}`, 
    //TODO: To be replaced with actual proof depending on prover mode.
    "");
    console.log("🔄 Updated Nexus Block");
    await sleep(2000);
    await proofManagerClient.updateChainState(accountDetails.response.nexus_header.number, accountDetails.response.proof, appId1, accountDetails.response.account);
    console.log("✅ Updated Chain State");
    const zksyncAdapter = new ZKSyncVerifier({
        [appId1]: {
            rpcUrl: zksync1URL,
            mailboxContract: mailboxAddressZKSYNC1,
            stateManagerContract: proofManagerAddressZKSYNC1,
            appID: appId1,
            chainId: "270",
            type: Networks.ZKSync,
            privateKey
        },
        [appId2]: {
            rpcUrl: zksync2URL,
            mailboxContract: mailboxAddressZKSYNC2,
            stateManagerContract: proofManagerAddressZKSYNC2,
            appID: appId2,
            chainId: "271",
            type: Networks.ZKSync,
            privateKey
        }
    }, appId1);
    let mailboxContract = new ethers.Contract(mailboxAddressZKSYNC1, mailboxAbi.abi, signerZKSYNC1);
    const mapping = await mailboxContract.messages(receiptHash);
    console.log("✅ Mapping exists:", mapping);
    const messageDetails = await mailboxContract.getSendMessage(receiptHash);
    console.log("✅ Message Details:", messageDetails);
    const storageSlot = getStorageLocationForReceipt(receiptHash);
    const proof = await zksyncAdapter.getReceiveMessageProof(accountDetails.response.account.height, messageDetails, {
        storageKey: storageSlot.toString()
    });
    console.log("✅ Proof exists:", proof);
    const errorDecoder = ErrorDecoder.create([BridgeABI.abi, mailboxAbi.abi, mailboxAbi.abi]);
    let receipt = null;
    try {
        const proofEncoded = zksyncAdapter.encodeMessageProof(proof);
        mailboxContract = new ethers.Contract(mailboxAddressZKSYNC2, mailboxAbi.abi, signerZKSYNC2);
        await mailboxContract.addOrUpdateWrapper(messageDetails.nexusAppIDFrom, { "verifier": zksyncVerifierAddress2, "mailboxAddress": mailboxAddressZKSYNC1 });
        const messageDecoded = {
            nexusAppIDFrom: messageDetails.nexusAppIDFrom,
            nexusAppIDTo: [...messageDetails.nexusAppIDTo],
            data: messageDetails.data,
            from: messageDetails.from,
            to: [...messageDetails.to],
            nonce: messageDetails.nonce
        };
        console.log("📨 Decoded Message:", messageDecoded);
        const transferTx = await mailboxContract.receiveMessage(accountDetails.response.account.height, messageDecoded, proofEncoded);
        receipt = await transferTx.wait();
        if (receipt && receipt.logs) {
            receipt.logs.forEach(log => {
                // Check if this is a Transfer event (topic0 is the event signature)
                if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                    console.log('Transfer Event:', {
                        from: '0x' + log.topics[1].substring(26),
                        to: '0x' + log.topics[2].substring(26),
                        amount: log.data
                    });
                }
            });
        }
        console.log("✅ ERC20 Transfer successful");
        console.log("🎉 Process completed successfully!");
    }
    catch (err) {
        console.error("❌ Error during ERC20 transfer:", err);
        const { reason } = await errorDecoder.decode(err);
        console.error('Revert reason:', reason);
    }
}
main();
async function waitForUpdateOnNexus(nexusClient, blockHeight) {
    console.log("⏳ Waiting for ZKSYNC1 to generate it's transaction batch...");
    //TODO: Link l2 block number to l1 batch number to confirm if the update was actually done, currently we wait for 10 seconds and expect it to be done in the meantime.
    await sleep(50000);
    const response = await nexusClient.getAccountState();
    if (response.response.account.height == 0) {
        throw new Error("❌ Account not yet initiated");
    }
    console.log("✅ Nexus update received");
    return response;
}
//# sourceMappingURL=index.js.map
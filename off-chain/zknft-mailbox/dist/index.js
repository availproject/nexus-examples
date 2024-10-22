import { ethers } from "ethers";
import { Provider as L2Provider } from "zksync-ethers";
import erc20Abi from "./erc20.json" with { type: "json" };
import nexusStateManagerAbi from "./nexusStateManager.json" with { type: "json" };
import paymentAbi from "./payment.json" with { type: "json" };
import nftAbi from "./nft.json" with { type: "json" };
import { NexusClient, ProofManagerClient } from "nexus-js";
let nexusRPCUrl = "http://127.0.0.1:7000";
let zksync_nft_url = "http://127.0.0.1:3050";
let zksync_payment_url = "http://127.0.0.1:4050";
let privateKeyZkSync = "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
let privateKeyZkSync2 = "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
let stateManagerNFTChainAddr = "0x6808E7cc3e91F51a2461962D4E3454c2301c0883";
let paymentContractAddress = "0x19b80d3A8fd2685902dF07499F6f82Abed9F2Ee9";
let paymentTokenAddr = "0x2085ad764326185203319e15442CE9EeE8C7052C";
let nftContractAddress = "0x1ca8830B35ca8312496Ed23b475d0af5d0515ea8";
let tokenId = 26;
let amount = "10";
let app_id = "3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d";
let app_id_2 = "1f5ff885ceb5bf1350c4449316b7d703034c1278ab25bcc923d5347645a0117e";
let nonce = 1;
//69b0257ca5f3ca861e5d56243f95cb3cc15ece5491deb561fff4c39546291296
async function main() {
    // 1. Deploy contracts: Mailbox + Nexus state manager  - done
    // 2. Deploy nft contracts on different chains - done
    // 3. Lock nft on one chain and pay on another chain
    // 4. Receive on NFT using inclusiong proof.
    // 5. Lock nft on one chain
    // 6. Withdraw nft using exclusion proof after timeout
    const nftNexusClient = new NexusClient(nexusRPCUrl, app_id);
    const paymentNexusClient = new NexusClient(nexusRPCUrl, app_id_2);
    // const mailbox = new nexus.MailBoxClient({
    //   `${app_id}` : nexus.
    // })
    //  const zksyncVerifier = new nexus.ZKSyncVerifier();
    let providerPayment = new L2Provider(zksync_payment_url);
    let providerNFT = new L2Provider(zksync_nft_url);
    if (!providerPayment) {
        return;
    }
    let signerPayment = new ethers.Wallet(privateKeyZkSync, providerPayment);
    let signerNFT = new ethers.Wallet(privateKeyZkSync2, providerNFT);
    const stateManagerNFTChain = new ethers.Contract(stateManagerNFTChainAddr, nexusStateManagerAbi, signerNFT);
    const paymentContract = new ethers.Contract(paymentContractAddress, paymentAbi, signerPayment);
    const paymentToken = new ethers.Contract(paymentTokenAddr, erc20Abi, signerPayment);
    const nftContract = new ethers.Contract(nftContractAddress, nftAbi, signerNFT);
    const proofManagerClient = new ProofManagerClient(stateManagerNFTChainAddr, zksync_nft_url, privateKeyZkSync);
    // this shouldn't be hardcoded, rather should be managed by sc. Doing it here since need time to write code
    // to get nft id from events if done via sc.
    await nftContract.mint(tokenId);
    await sleep(5000);
    await scenario1();
    async function scenario1() {
        // 3. Lock nft on one chain and pay on another chain
        // 4. Receive on NFT using inclusiong proof.
        const result = await lockNFT();
        console.log("Lock NFT Result", result);
        const paymentBlockNumber = await payForNFT();
        console.log("Payment Result", paymentBlockNumber);
        const accountDetails = await waitForUpdateOnNexus(paymentNexusClient, paymentBlockNumber);
        console.log("Nexus state already updated! ✅ \n");
        //console.log("Before calling get chain state");
        //console.log("current chain state", await proofManagerClient.getChainState(`0x${app_id_2}`, paymentBlockNumber));
        console.log("Trying to update nexus block: ", accountDetails.response.nexus_header.number);
        await proofManagerClient.updateNexusBlock(accountDetails.response.nexus_header.number, `0x${accountDetails.response.nexus_header.state_root}`, 
        //TODO: To be replaced by hash of nexus header.
        `0x${accountDetails.response.nexus_header.avail_header_hash}`, 
        //TODO: To be replaced with actual proof depending on prover mode.
        "");
        console.log("Updated nexus block next is proof", "\n", accountDetails.response.nexus_header.state_root, "\n", accountDetails.response.proof, accountDetails.response);
        await sleep(2000);
        await proofManagerClient.updateChainState(accountDetails.response.nexus_header.number, accountDetails.response.proof, app_id_2, accountDetails.response.account);
        console.log("Updated chain state");
        // await getPaymentProof(); using zksync adapter ( class ) in sdk, from sdk
        // await receiveNFT();
    }
    // async function scenario2() {
    //   // 5. Lock nft on one chain
    //   // 6. Withdraw nft using exclusion proof after timeout
    //   let lockHash = await lockNFT();
    //   await fetchUpdatesFromNexus();
    //   await withdrawNFT(lockHash[1]);
    // }
    async function lockNFT() {
        console.log("Inside lock NFT");
        const tx = await nftContract.lockNFT(tokenId, ethers.parseEther("1"), await paymentContract.getCurrentNonce(await signerPayment.getAddress()), await paymentToken.getAddress());
        console.log("Sent tx \n");
        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        // Filter the LockHash event from the transaction receipt
        const event = receipt.logs.find(log => {
            return log.topics[0] === ethers.id("LockHash(bytes32)");
        });
        if (!event) {
            throw new Error("LockHash event not found in transaction logs");
        }
        // Decode the event data
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["bytes32"], event.data);
        // Get the lock hash as a string
        const lockHash = decoded[0];
        console.log("LockHash:", lockHash.toString());
        return [receipt.blockNumber, lockHash.toString()];
    }
    async function payForNFT() {
        console.log("Trying to mint");
        // Check the balance of the signerPayment
        const signerPaymentAddress = await signerPayment.getAddress();
        const balance = await paymentToken.balanceOf(signerPaymentAddress);
        console.log("Signer Balance:", ethers.formatEther(balance));
        // Ensure the signer has enough balance for the payment
        const amountToPay = ethers.parseEther(amount);
        if (balance < amountToPay) {
            throw new Error("Insufficient balance to pay for NFT");
        }
        // Approve the paymentContract to spend the amount on behalf of the user
        console.log("Approving token for payment contract...");
        const approveTx = await paymentToken.approve(await paymentContract.getAddress(), amountToPay);
        // Wait for the approval transaction to be mined
        await approveTx.wait();
        console.log("Token approved for payment contract.");
        // Now proceed with the payment
        console.log("Paying amount now", await paymentToken.getAddress(), await signerNFT.getAddress(), await paymentToken.balanceOf(signerPaymentAddress));
        // The below sends message to mailbox
        const tx = await paymentContract.pay(await paymentToken.getAddress(), amountToPay, // Use the approved amount
        tokenId, await signerNFT.getAddress());
        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("Payment Receipt", receipt);
        return receipt.blockNumber;
    }
    async function receiveNFT(message, proof) {
        try {
            // fetch message info from mailbox using sdk
            await nftContract.transferNFT(0, message, proof);
            console.log("NFT Transfered....");
        }
        catch {
            console.log("NFT Transfer failed");
        }
    }
    async function withdrawNFT(lockHash) {
        let proof;
        // sdk.zksync.getProof()
        nftContract.withdrawNFT(lockHash, proof);
    }
}
main().then(() => {
    process.exit(0);
});
function sleep(val) {
    const duration = val !== undefined ? val : 30 * 1000;
    return new Promise((resolve) => setTimeout(resolve, duration));
}
async function waitForUpdateOnNexus(nexusClient, blockHeight) {
    //TODO: Link l2 block number to l1 batch number to confirm if the update was actually done, currently we wait for 10 seconds and expect it to be done in the meantime.
    await sleep(10000);
    const response = await nexusClient.getAccountState();
    if (response.response.account.height == 0) {
        throw new Error("Account not yet initiated");
    }
    return response;
    // for (let i = 0; i <= 20; i++) {
    //   const response: AccountApiResponse = await nexusClient.getAccountState();
    //   if (response.response.account.height >= blockHeight) {
    //     return response;
    //   }
    //   console.log("Required zksync block not yet updated on nexus.");
    //   await sleep(1000);
    // }
}
//# sourceMappingURL=index.js.map
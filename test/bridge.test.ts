import {
    ethers,
    Log,
    TransactionReceipt,
    Provider,
    keccak256,
    lock,
  } from "ethers";
  import { Provider as L2Provider,  types } from "zksync-ethers";
  
  import {
    NexusClient,
    MailBoxClient,
    ProofManagerClient,
    ZKSyncVerifier,
  } from "nexus-js";
  import { AccountApiResponse } from "nexus-js";
  import { Networks, } from "nexus-js";
  import { MailboxMessageStruct as MailboxMessage, getStorageLocationForReceipt } from "nexus-js";
  
  import { AbiCoder } from "ethers";
  import { ParamType } from "ethers";
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
  // NexusProofManager deployed to:  0xF2D362D78d8d2990EBd2d2FDCd77A0edBA840540
  // Mailbox deployed to:  0x9b3Cf1E8c8Aa228E4bAA110Aa6F5eD2dc55f7644
  // Verifer deployed to :  0x74040d76894401D697750509ac0Ac5Dd0BAf1a93
  
  const NexusBridgeZKSYNC1 = "0xed96D8c63c173dE735376d7bbC614295c07Dc195";
  const ERC20TokenZKSYNC1 = "0x9b3Cf1E8c8Aa228E4bAA110Aa6F5eD2dc55f7644";
  const NexusBridgeZKSYNC2 = "0xcaA11287bbe2463EE48B32c259df5aF61Bf89871";
  const zksyncVerifierAddress2 = "0xC41ff55Bf1E8f99A3c00d6a280871042CFb2c8e4";
  const ERC20TokenZKSYNC2 = "0xCB4C4022Df83139FEC1e0983232D1BE60b7eD533";
  const mailboxAddressZKSYNC1 = "0x9a03a545A60263216c4310Be05C34B71C170903A"
  const mailboxAddressZKSYNC2 = "0x9b3Cf1E8c8Aa228E4bAA110Aa6F5eD2dc55f7644"
  const proofManagerAddressZKSYNC2 = "0xF2D362D78d8d2990EBd2d2FDCd77A0edBA840540"
  const proofManagerAddressZKSYNC1 = "0xaaA07C6575E855AA279Ba04B63E8C5ee7FBc5908"
  const privateKey =
    "0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6";
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
    const signerZKSYNC1 = new ethers.Wallet(
      privateKey,
      zksync1Provider as unknown as Provider
    );
    const signerZKSYNC2 = new ethers.Wallet(
      privateKey,
      zksync2Provider as unknown as Provider
    );
    const bridgeContractZKSYNC1 = new ethers.Contract(
      NexusBridgeZKSYNC1,
      BridgeABI.abi,
      signerZKSYNC1
    );
    const bridgeContractZKSYNC2 = new ethers.Contract(
      NexusBridgeZKSYNC2,
      BridgeABI.abi,
      signerZKSYNC2
    );
  
    const erc20TokenZKSYNC1Contract = new ethers.Contract(
      ERC20TokenZKSYNC1,
      ERC20Abi,
      signerZKSYNC1
    );
  
    const lockAmount = ethers.parseEther("1");
    // Lock ETH
    await erc20TokenZKSYNC1Contract.mint(
      signerZKSYNC1.address,
      ethers.parseEther("10")
    );
    await erc20TokenZKSYNC1Contract.approve(bridgeContractZKSYNC1, lockAmount);
  
    const assetId = ethers.zeroPadValue(ethers.toBeHex(1), 32);
    await bridgeContractZKSYNC1.updateNexusTokens(
      [assetId],
      [await erc20TokenZKSYNC1Contract.getAddress()]
    );
    console.log("💸 Sending ERC20 tokens...");
  
    let receiptHash: string = "0x";
    let blockNumber: number = 0;
    try {
      const balance = await erc20TokenZKSYNC1Contract.balanceOf(signerZKSYNC1.address);
      
      const tx = await bridgeContractZKSYNC1.sendERC20(
        assetId,
        ethers.zeroPadValue(ethers.toBeHex(signerZKSYNC1.address), 32), 
        lockAmount,
        [appId2],
        nonce,
        [await bridgeContractZKSYNC2.getAddress()]
      );
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
        } catch (err) {
        
          continue;
        }
      }
      console.log("✅ Successfully sent ERC20 tokens");
    } catch (error) {
      console.error("❌ Error sending ERC20 tokens:", error);
      throw error;
    }
  
    // 2. Fetch storage proof from zksync1
    console.log("🔍 Fetching storage proof from ZKSYNC1...");
    const proofManagerClient = new ProofManagerClient(proofManagerAddressZKSYNC2, zksync2URL, privateKey);
    const zksync1NexusClient = new NexusClient(nexusRPCUrl, appId1);
    const accountDetails: AccountApiResponse = await waitForUpdateOnNexus(zksync1NexusClient, blockNumber);
    console.log("ℹ️ Account details:", accountDetails);
    await proofManagerClient.updateNexusBlock(
      accountDetails.response.nexus_header.number,
      `0x${accountDetails.response.nexus_header.state_root}`,
      //TODO: To be replaced by hash of nexus header.
      `0x${accountDetails.response.nexus_header.avail_header_hash}`,
      //TODO: To be replaced with actual proof depending on prover mode.
      ""
    );
    console.log("🔄 Updated Nexus Block");
    await sleep(2000);
    await proofManagerClient.updateChainState(
      accountDetails.response.nexus_header.number,
      accountDetails.response.proof,
      appId1,
      accountDetails.response.account
    )
  
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
  
    const storageSlot =  getStorageLocationForReceipt(receiptHash);
  
    const proof = await zksyncAdapter.getReceiveMessageProof(accountDetails.response.account.height,
      messageDetails,
      {
        storageKey: storageSlot.toString()
      });
  
    console.log("✅ Proof exists:", proof);
  
    const errorDecoder = ErrorDecoder.create([BridgeABI.abi, mailboxAbi.abi, mailboxAbi.abi])
    let receipt: TransactionReceipt | null = null;
    try {
      const proofEncoded = zksyncAdapter.encodeMessageProof(proof);
      
      mailboxContract = new ethers.Contract(mailboxAddressZKSYNC2, mailboxAbi.abi, signerZKSYNC2);
      
      await mailboxContract.addOrUpdateWrapper(messageDetails.nexusAppIDFrom,{"verifier":zksyncVerifierAddress2, "mailboxAddress":mailboxAddressZKSYNC1});
      const messageDecoded: MailboxMessage = {
        nexusAppIDFrom: messageDetails.nexusAppIDFrom,
        nexusAppIDTo: [...messageDetails.nexusAppIDTo],
        data: messageDetails.data,
        from: messageDetails.from,
        to: [...messageDetails.to],
        nonce: messageDetails.nonce
      }
  
  
  
      console.log("📨 Decoded Message:", messageDecoded);
  
      const transferTx = await mailboxContract.receiveMessage(
        accountDetails.response.account.height,
        messageDecoded,
        proofEncoded,
      )
  
      receipt = await transferTx.wait();
    
      console.log("✅ ERC20 Transfer successful");
    } catch (err) {
      console.error("❌ Error during ERC20 transfer:", err);
      const { reason } = await errorDecoder.decode(err)
      console.error('Revert reason:', reason)
    }
  
    console.log("🎉 Process completed successfully!");
  }
  
  main();
  
  
  
  async function waitForUpdateOnNexus(nexusClient: NexusClient, blockHeight: number): Promise<AccountApiResponse> {
    console.log("⏳ Waiting for ZKSYNC1 to generate it's transaction batch...");
    //TODO: Link l2 block number to l1 batch number to confirm if the update was actually done, currently we wait for 10 seconds and expect it to be done in the meantime.
    await sleep(50000);
    const response: AccountApiResponse = await nexusClient.getAccountState();
  
    if (response.response.account.height == 0) {
      throw new Error("❌ Account not yet initiated");
    }
    console.log("✅ Nexus update received");
    return response;
  }
  
  
  
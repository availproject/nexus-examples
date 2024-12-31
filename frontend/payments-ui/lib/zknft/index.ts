import { nftContractAddress, nftMintProviderURL, paymentChainId, paymentContractAddress, paymentTokenAddr, paymentZKSyncProviderURL, privateKeyZkSync } from './config';
import { Contract, ethers, Wallet } from 'ethers';
import { Provider, types } from 'zksync-ethers';
import erc20Abi from "./erc20.json";
import paymentAbi from "./payment.json";
import { useReadContract, useWriteContract, usePublicClient } from 'wagmi';

export type Message = {
  nexusAppIDFrom: string; // bytes32 -> string
  nexusAppIDTo: string[]; // bytes32[] -> string[]
  data: string; // bytes -> string
  from: string; // address -> string
  to: string[]; // address[] -> string[]
  nonce: bigint | string;
};


export function getProvider(): Provider {
  let provider = Provider.getDefaultProvider(types.Network.Localhost);
  return provider;
}

export function getPaymentWallet(provider?: Provider): Wallet {
  return new Wallet(privateKeyZkSync, provider)
}

export async function getAddress(): Promise<string> {
  return await getPaymentWallet().getAddress();
}

export async function transfer(
  amount: bigint,
  signerPaymentAddress: string,
  tokenID: number,
  toAddress: string,
  writeContractAsync: any,
  publicClient: any
): Promise<[number, string, Message] | undefined> {
  try {
    const paymentToken = new Contract(paymentTokenAddr, erc20Abi, new Wallet(privateKeyZkSync, new Provider(paymentZKSyncProviderURL)));
    if (!paymentToken) {
      throw new Error("Failed to create payment token contract");
    }

    console.log("Trying to mint");

    // Check the balance of the signerPayment
    const balance = await (paymentToken as any).balanceOf(signerPaymentAddress);
    console.log("Signer Balance:", ethers.formatEther(balance));

    // Ensure the signer has enough balance for the payment
    const amountToPay = ethers.parseEther("10");
    if (balance < amountToPay) {
      await (paymentToken as any).transfer(signerPaymentAddress, amountToPay);
      console.log("minted balance")
    }

    // Approve the paymentContract to spend the amount on behalf of the user
    console.log("Approving token for payment contract...");

    const approveTxHash = await writeContractAsync({
      address: paymentTokenAddr as `0x${string}`,
      abi: erc20Abi,
      functionName: "approve",
      args: [paymentContractAddress, amountToPay],
      chainId: paymentChainId,
    });

    // Wait for approval receipt
    console.log("Waiting for approval receipt...");
    const approveTxReceipt = await publicClient.waitForTransactionReceipt({
      hash: approveTxHash,
      chainId: paymentChainId,
    });
    console.log("Token approved for payment contract.", approveTxReceipt);

    // Now proceed with the payment
    console.log("Paying amount now", paymentTokenAddr, toAddress, balance);

    const payTxHash = await writeContractAsync({
      address: paymentContractAddress as `0x${string}`,
      abi: paymentAbi,
      functionName: "pay",
      args: [paymentTokenAddr, amountToPay, tokenID, toAddress],
      chainId: paymentChainId,
    });

    // Wait for payment receipt
    console.log("Waiting for payment receipt...");
    const payTxReceipt = await publicClient.waitForTransactionReceipt({
      hash: payTxHash,
      chainId: paymentChainId,
    });
    console.log("Payment done");

    let receiptHash: string = "0x";
    let message: Message | undefined = undefined;

    for (const log of payTxReceipt.logs) {
      try {
        const abi = [
          "event MailboxEvent(bytes32 indexed nexusAppIDFrom, bytes32[] nexusAppIDTo, bytes data, address indexed from, address[] to, uint256 nonce, bytes32 receiptHash)"
        ];
        const eventInterface = new ethers.Interface(abi);
        const decodedLog = eventInterface.decodeEventLog("MailboxEvent", log.data, log.topics);
        message = {
          nexusAppIDFrom: decodedLog.nexusAppIDFrom,
          nexusAppIDTo: decodedLog.nexusAppIDTo,
          data: decodedLog.data,
          from: decodedLog.from,
          to: decodedLog.to,
          nonce: decodedLog.nonce.toString(),
        };
        console.log("emitted event", decodedLog);
        receiptHash = decodedLog.receiptHash;
        break;
      } catch (err) {
        continue;
      }
    }

    if (!receiptHash || !message) {
      throw new Error("Failed to get receipt hash");
    }

    return [payTxReceipt.blockNumber, receiptHash, message];
  } catch (e) {
    console.error("error", e);
    throw e;
  }
}

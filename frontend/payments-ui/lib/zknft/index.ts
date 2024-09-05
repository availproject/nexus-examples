
import { paymentContractAddress, paymentTokenAddr, privateKeyZkSync } from './config';
import { Contract, ethers, Wallet } from 'ethers';
import { Provider, types } from 'zksync-ethers';
import erc20Abi from "./erc20.json";
import paymentAbi from "./payment.json";

export type Message = {
  messageType: string;
  from: string;
  data: string;
  messageId: number;
  chainId: number;
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

export async function transfer(amount: bigint): Promise<Message | undefined> {
  try {
    const provider = getProvider();
    const wallet: Wallet = getPaymentWallet(provider);
    let paymentToken: Contract = new Contract(
      paymentTokenAddr,
      erc20Abi,
      wallet,
    );
    let paymentContract: Contract = new Contract(
      paymentContractAddress,
      paymentAbi,
      wallet,
    );

    const response = await paymentContract.updatePrice(
      await paymentToken.getAddress(),
      amount / BigInt(2)
    );

    await paymentToken!.mint(await wallet.getAddress(), amount);
    await paymentToken!.approve(await paymentContract.getAddress(), amount);

    console.debug("Making Payment");
    const tx = await paymentContract!.paymentWithoutFallback(
      "0x01",
      1337,
      amount,
      await paymentToken.getAddress()
    );

    const receipt = await tx.wait();

    const txDetails = await provider.getTransactionReceipt(receipt.hash);
    console.debug("Payment Receipt: ", txDetails);
    const preImageEvents = txDetails!.logs.filter(
      (log) =>
        log.topics[0] ===
        ethers.id("PreImage(bytes1,bytes32,bytes,uint256,uint256)")
    );

    const parsedEvents: Message[] = preImageEvents.map((event) => {
      const [messageType, from, data, messageId, chainId] =
        ethers.AbiCoder.defaultAbiCoder().decode(
          ["bytes1", "bytes32", "bytes", "uint256", "uint256"],
          event.data
        );

      return {
        messageType,
        from,
        data,
        messageId: messageId.toString(),
        chainId: chainId.toString(),
      };
    });

    return parsedEvents[0] as Message;
  } catch (e) {
    console.error("error", e);
  }
}

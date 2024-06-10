use abi::AbiEncode;
use anyhow::Result;
use ethers::abi::encode;
use ethers::core::abi::Abi;
use ethers::{
    prelude::*,
    signers::{LocalWallet, MnemonicBuilder},
    utils::*,
};
use hex_literal::hex;

use rlp::RlpStream;
use sha3::digest::consts::U25;
use std::fs::File;
use std::io::Read;
use std::str::FromStr;
use std::{sync::Arc, vec};

// fill these after deployment
const ADDRESS_1337: &str = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const ADDRESS_1338: &str = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
const STATE_MANAGER_ADDR: &str = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";

abigen!(BridgeContract, "bridge.json");
#[derive(Debug)]
pub struct Proof {
    proof: EIP1186ProofResponse,
    block_number: U64,
    state_hash: H256,
}

// #[derive(Clone, Debug, Default, EthAbiType)]
// pub struct Message {
//     pub message_type: [u8; 1],
//     pub from: [u8; 32],
//     pub to: [u8; 32],
//     pub origin_domain: u32,
//     pub destination_domain: u32,
//     pub data: Vec<u8>,
//     pub message_id: u64,
// }
pub async fn crosschain_wrapper() -> Result<()> {
    let private_key = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    let wallet = private_key.parse::<LocalWallet>()?;

    let rpc_provider1 = Arc::new({
        let provider = Provider::<Http>::try_from("http://127.0.0.1:8545")?;
        let chain_id = provider.get_chainid().await?;
        let wallet = private_key
            .parse::<LocalWallet>()?
            .with_chain_id(chain_id.as_u64());
        SignerMiddleware::new(provider, wallet)
    });

    let rpc_provider2 = Arc::new({
        let provider = Provider::<Http>::try_from("http://127.0.0.1:8546")?;
        let chain_id = provider.get_chainid().await?;
        let wallet = private_key
            .parse::<LocalWallet>()?
            .with_chain_id(chain_id.as_u64());
        SignerMiddleware::new(provider, wallet)
    });

    let _ = crosschain(
        rpc_provider1,
        rpc_provider2,
        ADDRESS_1337,
        STATE_MANAGER_ADDR,
    )
    .await;
    Ok(())
}

async fn crosschain(
    rpc_provider_destination: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    rpc_provider_target: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    bridge_address: &str,
    state_manager_address: &str,
) -> Result<()> {
    // assuming deployment of StorageProof contract is already done

    let address = bridge_address.parse::<Address>()?;

    let abi = read_abi_from_file("./bridge.json").unwrap();
    let bridge_contract_destination = Contract::new(
        address,
        abi.clone(),
        Arc::new(rpc_provider_destination.clone()),
    );

    match send_eth_and_receive_proof(rpc_provider_destination, bridge_contract_destination).await {
        Ok(storage_proof) => {
            println!("Storage proof: {:?}", storage_proof);
            // call and update nexus state manager for this block
            let state_manager_abi = read_abi_from_file("./nexusStateManager.json").unwrap();
            let state_manager_target = Contract::new(
                state_manager_address.parse::<Address>()?,
                state_manager_abi,
                Arc::new(rpc_provider_target.clone()),
            );

            let account_proof: Vec<u8> = storage_proof
                .proof
                .account_proof
                .iter()
                .flat_map(|bytes| bytes.as_ref().to_vec())
                .collect();

            let method_call = state_manager_target.method::<(U256, U256, U256, Bytes, H256), ()>(
                "updateChainState",
                (
                    U256::from(1337),
                    U256::from(storage_proof.block_number.as_u64()),
                    U256::from(1),
                    account_proof.into(),
                    storage_proof.state_hash,
                ),
            )?;

            let result = method_call.send().await;

            match result {
                Ok(tx) => {
                    println!("Transaction sent successfully: {:?} and included", tx);
                    let finalisation = tx.confirmations(1).await?;
                    match finalisation {
                        Some(_) => {
                            println!("updateChainState() tx send and included");
                            println!("minting tokens aka receive against the updated state root");

                            /************************************* */
                            // mock a send transaction on target contract to fund it with eth
                            let address_str = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
                            let address_bytes = hex::decode(address_str).expect("Decoding failed");
                            let address_array: [u8; 20] =
                                address_bytes.as_slice().try_into().expect("Invalid length");
                            let mut padded_address = [0u8; 32];
                            padded_address[12..].copy_from_slice(&address_array);
                            let amount_to_send = U256::from(1_000_000_000_000u64);
                            let send_tx = bridge_contract_target
                                .send_eth(padded_address)
                                .value(amount_to_send);
                            let receipt = send_tx.send().await;

                            println!("{:?}", receipt);

                            //******************************** */

                            let bridge_contract_target =
                                BridgeContract::new(address, rpc_provider_target.clone());

                            let encoded_proof = encode_proof(storage_proof.proof.account_proof);

                            let value1 = abi::Token::String(
                                "4554480000000000000000000000000000000000000000000000000000000000"
                                    .to_string(),
                            );
                            let value2 = abi::Token::Uint(1000.into());
                            let encoded = encode(&[value1, value2]);

                            let message = Message {
                                message_type: [0x02],
                                from: hex::decode("00000000000000000000000070997970C51812dc3A010C7d01b50e0d17dc79C8")?.try_into().unwrap(),
                                to: hex::decode("00000000000000000000000070997970C51812dc3A010C7d01b50e0d17dc79C8")?.try_into().unwrap(),
                                origin_domain: 1,
                                destination_domain: 2,
                                data: Bytes::from(encoded),
                                message_id: 2_u64,
                            };

                            let tx = bridge_contract_target.receive_eth(
                                message,
                                Bytes::from(encoded_proof.as_bytes().to_vec()),
                            );
                            println!("{:?}", tx);

                            let receipt = tx.send().await;
                            println!("working");
                            if let Ok(rec) = receipt {
                                println!("{:?} {}", rec, "sfsdf");
                            } else {
                                print!("{:?} {}", receipt, "f312fr23");
                            }

                            // let receipt = pending_tx.confirmations(1).await?;

                            // if let Some(tx_receipt) = receipt {
                            //     println!("Receipt {:?}", tx_receipt);
                            // } else {
                            //     eprint!("Transaction failed");
                            // }
                        }
                        None => {
                            eprint!("Error - invalid tx");
                        }
                    }
                }
                Err(e) => {
                    println!("nothing here ???");
                    eprintln!("Error sending transaction: {:?}", e);
                }
            }
        }
        Err(e) => {
            eprint!("error: {:?}", e);
        }
    }

    Ok(())
}

fn encode_proof(account_proofs: Vec<Bytes>) -> String {
    let proofs = concatenate_proof(account_proofs);
    let rlp_encoded_proof = encode_rlp(proofs);
    let proof_hex = hex::encode(rlp_encoded_proof);
    proof_hex
}

fn concatenate_proof(account_proof: Vec<ethers::types::Bytes>) -> Vec<Vec<u8>> {
    let mut proofs: Vec<Vec<u8>> = Vec::new();
    for node in account_proof {
        proofs.push(node.to_vec()); // Convert each Bytes to Vec<u8> and push to proofs
    }
    proofs
}

fn encode_rlp(proofs: Vec<Vec<u8>>) -> Vec<u8> {
    let mut stream = RlpStream::new();
    stream.begin_list(proofs.len()); // Begin a list to encode the array structure
    for proof in proofs {
        stream.append(&proof); // Append each proof as raw bytes
    }
    stream.out().to_vec() // Get the RLP-encoded bytes
}

pub async fn send_eth_and_receive_proof(
    provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    contract: Contract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
) -> Result<Proof> {
    let address_str = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
    let address_bytes = hex::decode(address_str).expect("Decoding failed");
    let address_array: [u8; 20] = address_bytes.as_slice().try_into().expect("Invalid length");
    let mut padded_address = [0u8; 32];
    padded_address[12..].copy_from_slice(&address_array);

    let recipient: H256 = H256::from(padded_address);

    let amount_to_send = U256::from(1_000_000_000u64);

    let method_call = contract
        .method::<(H256,), ()>("sendETH", (recipient,))?
        .value(amount_to_send);

    let tx = method_call.send().await?;

    let receipt = tx.confirmations(1).await?;
    if let Some(receipt) = receipt {
        let block_number = receipt.block_number.unwrap();
        println!("Transaction status: {:?}", receipt.status);
        let block = provider.get_block(BlockNumber::Latest).await?.unwrap();
        let state_root = block.state_root;

        let proof: EIP1186ProofResponse =
            get_storage_slot(provider, contract, BlockId::from(block_number)).await?;

        let proof_extended = Proof {
            proof: proof,
            block_number: block_number,
            state_hash: state_root,
        };

        return Ok(proof_extended);
    }
    Err(anyhow::anyhow!("Transaction receipt not found"))
}

async fn get_storage_slot(
    provider: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
    contract: Contract<Arc<SignerMiddleware<Provider<Http>, LocalWallet>>>,
    block_number: BlockId,
) -> Result<EIP1186ProofResponse> {
    let key = contract.method::<_, U256>("messageId", ())?.call().await?;
    let slot = U256::zero();
    let mut encoded = [0u8; 64];
    key.to_big_endian(&mut encoded[0..32]);
    slot.to_big_endian(&mut encoded[32..64]);

    let storage_slot = keccak256(&encoded);
    println!("Calculated Storage slot {:?}", H256::from(storage_slot));
    let address = contract.address();
    let proof = provider
        .get_proof(address, vec![H256::from(storage_slot)], Some(block_number))
        .await?;
    Ok((proof))
}

fn read_abi_from_file(file_path: &str) -> Result<Abi, Box<dyn std::error::Error>> {
    let mut file = File::open(file_path)?;

    let mut abi_json = String::new();
    file.read_to_string(&mut abi_json)?;

    let abi: Abi = serde_json::from_str(&abi_json)?;

    Ok(abi)
}

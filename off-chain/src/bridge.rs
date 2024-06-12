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

use macros::ethers_core_crate;
use rlp::RlpStream;
use sha3::digest::consts::U25;
use std::fmt::Pointer;
use std::fs::File;
use std::io::Read;
use std::ops::Deref;
use std::str::FromStr;
use std::{sync::Arc, vec};

// fill these after deployment
const BRIDGE_ADDRESS_1337: &str = "0x3347B4d90ebe72BeFb30444C9966B2B990aE9FcB";
const BRIDGE_ADDRESS_1338: &str = "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e";
const STATE_MANAGER_ADDR: &str = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";

abigen!(BridgeContract, "bridge.json");
abigen!(StateContract, "nexusStateManager.json");
#[derive(Debug)]
pub struct Proof {
    proof: EIP1186ProofResponse,
    block_number: U64,
    state_hash: H256,
    address: H160,
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
        BRIDGE_ADDRESS_1337,
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

            let state_manager_target = StateContract::new(
                state_manager_address.parse::<Address>()?,
                Arc::new(rpc_provider_target.clone()),
            );

            let encoded_proof = format!("0x{}", encode_proof(storage_proof.proof.account_proof));

            println!(
                "Encoded proof: {:?}   from address {:?}",
                encoded_proof,
                storage_proof.address.clone()
            );

            let method_call = state_manager_target.method::<(U256, U256, U256, Bytes, H256), ()>(
                "updateChainState",
                (
                    U256::from(137),
                    U256::from(storage_proof.block_number.as_u64()),
                    U256::from(1),
                    hex_to_bytes(&encoded_proof.as_str())?,
                    storage_proof.state_hash,
                ),
            )?;

            // Note: the below works
            // let method_call = state_manager_target.verify_account(
            //     storage_proof.state_hash.into(),
            //     hex_to_bytes(&proof_hex.as_str())?,
            //     BRIDGE_ADDRESS_1337.parse::<Address>()?,
            // );

            let result = method_call.send().await;

            match result {
                Ok(tx) => {
                    println!("Transaction sent successfully: {:?} and included", tx);
                    let finalisation = tx.confirmations(1).await?;
                    match finalisation {
                        Some(_) => {
                            println!("updateChainState() tx send and included");
                            println!("minting tokens aka receive against the updated state root");

                            let bridge_contract_target = BridgeContract::new(
                                BRIDGE_ADDRESS_1338.parse::<Address>()?,
                                rpc_provider_target.clone(),
                            );

                            /************************************* */
                            // mock a send transaction on target contract to fund it with eth
                            let address_str = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
                            let address_bytes = hex::decode(address_str).expect("Decoding failed");
                            let address_array: [u8; 20] =
                                address_bytes.as_slice().try_into().expect("Invalid length");
                            let mut padded_address = [0u8; 32];

                            padded_address[12..].copy_from_slice(&address_array);
                            let amount_to_send: U256 = U256::from(1_000_000_000_000_000_000_u64);

                            let provider = Provider::<Http>::try_from("http://localhost:8546")?;
                            let block_n = provider.get_block_number().await?;

                            let initial_balance = provider
                                .get_balance(BRIDGE_ADDRESS_1338, Some(BlockId::from(block_n)))
                                .await;
                            let send_tx = bridge_contract_target
                                .send_eth(padded_address)
                                .value(amount_to_send);
                            let r = send_tx.send().await;
                            match r {
                                Ok(r) => {
                                    let final_balance = provider
                                        .get_balance(
                                            BRIDGE_ADDRESS_1338,
                                            Some(BlockId::from(block_n)),
                                        )
                                        .await;

                                    println!(
                                        "Transferred mock eth to the contract from {:?} to {:?}",
                                        initial_balance.unwrap(),
                                        final_balance.unwrap()
                                    );
                                }
                                Err(e) => {
                                    println!("{:?}", e)
                                }
                            }

                            //******************************** */
                            let value1 = abi::Token::String(
                                "4554480000000000000000000000000000000000000000000000000000000000"
                                    .to_string(),
                            );
                            let value2 = abi::Token::Uint(1.into());
                            let encoded = encode(&[value1, value2]);

                            // Check if state root is updated correctly - done

                            let message = Message {
                                message_type: [0x02],
                                from: hex::decode("00000000000000000000000070997970C51812dc3A010C7d01b50e0d17dc79C8")?.try_into().unwrap(),
                                to: hex::decode("0000000000000000000000003347B4d90ebe72BeFb30444C9966B2B990aE9FcB")?.try_into().unwrap(),
                                origin_domain: 1_u32,
                                destination_domain: 2_u32,
                                data: Bytes::from(encoded),
                                message_id: 2_u64,
                            };

                            let tx = bridge_contract_target.receive_eth(
                                message,
                                Bytes::from(encoded_proof.as_bytes().to_vec()),
                            );

                            let receipt = tx.send().await;

                            match receipt {
                                Ok(rec) => {
                                    println!("Transaction successful: {:?}", rec);

                                    let tx_hash = rec.tx_hash();

                                    let _ = rec.await;
                                    let filter = bridge_contract_target.events();

                                    println!("{:?}", filter);
                                }
                                Err(err) => {
                                    let error_string = format!("{:?}", err);

                                    if error_string.contains("Revert") {
                                        println!("Transaction reverted with data: {:?}", err);
                                    } else {
                                        println!("Transaction failed: {:?}", err);
                                    }
                                }
                            }
                        }
                        None => {
                            eprint!("Error - invalid tx");
                        }
                    }
                }
                Err(e) => {
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
            get_storage_slot(provider, contract.clone(), BlockId::from(block_number)).await?;

        let proof_extended = Proof {
            proof: proof,
            block_number: block_number,
            state_hash: state_root,
            address: contract.address(),
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

use ::hex::FromHex;
fn hex_to_bytes(hex: &str) -> Result<Bytes, hex::FromHexError> {
    // Remove the "0x" prefix if it exists
    let hex_trimmed = hex.trim_start_matches("0x");
    // Decode the hex string to a byte vector
    let bytes = Vec::from_hex(hex_trimmed)?;
    // Convert the byte vector to Bytes
    Ok(Bytes::from(bytes))
}

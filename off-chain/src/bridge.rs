use abi::AbiEncode;
use anyhow::Result;
use ethers::abi::encode;
use ethers::core::abi::Abi;
use ethers::{prelude::*, utils::*};
use rlp::RlpStream;
use std::fs::File;
use std::io::Read;
use std::{sync::Arc, vec};

// fill these after deployment
const ADDRESS_1337: &str = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ADDRESS_1338: &str = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";

#[derive(Debug)]
pub struct Proof {
    proof: EIP1186ProofResponse,
    block_number: U64,
    state_hash: H256,
}

#[derive(Clone, Debug, Default, EthAbiType)]
pub struct Message {
    pub message_type: [u8; 1],
    pub from: [u8; 32],
    pub to: [u8; 32],
    pub origin_domain: u32,
    pub destination_domain: u32,
    pub data: Vec<u8>,
    pub message_id: u64,
}
pub async fn crosschain_wrapper() -> Result<()> {
    let rpc_provider1 = Provider::<Http>::try_from("http://127.0.0.1:8545").unwrap();
    let rpc_provider2 = Provider::<Http>::try_from("http://127.0.0.1:8546").unwrap();

    let _ = crosschain(rpc_provider1, rpc_provider2, ADDRESS_1337, ADDRESS_1338).await;
    Ok(())
}

async fn crosschain(
    rpc_provider_destination: Provider<Http>,
    rpc_provider_target: Provider<Http>,
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

            let result = state_manager_target
                .method::<(i32, U256, Vec<ethers::types::Bytes>, H256), ()>(
                    "updateChainState",
                    (
                        1337,
                        U256::from(storage_proof.block_number.as_u64()),
                        storage_proof.proof.account_proof.clone(),
                        storage_proof.state_hash,
                    ),
                );

            match result {
                Ok(_) => {
                    // mint tokens aka receive against the updated state root
                    let bridge_contract_target =
                        Contract::new(address, abi, Arc::new(rpc_provider_target.clone()));

                    let encoded_proof = encode_proof(storage_proof.proof.account_proof);

                    let value1 = abi::Token::String(
                        "4554480000000000000000000000000000000000000000000000000000000000"
                            .to_string(),
                    );
                    let value2 = abi::Token::Uint(1000.into());
                    let encoded = encode(&[value1, value2]);

                    let message = Message {
                        message_type: [0x02],
                        from: [0x00; 32], // Replace with actual sender address
                        to: [0x00; 32],   // Replace with actual receiver address
                        origin_domain: 1,
                        destination_domain: 2,
                        data: encoded,
                        message_id: 1_u64,
                    };

                    let tx = bridge_contract_target.method::<(Message, std::string::String), ()>(
                        "receiveETH",
                        (message, encoded_proof),
                    )?;

                    let pending_tx = tx.send().await?;
                    let receipt = pending_tx.confirmations(1).await?;

                    if let Some(tx_receipt) = receipt {
                        println!("Receipt {:?}", tx_receipt);
                    } else {
                        eprint!("Transaction failed");
                    }
                }
                Err(e) => {
                    eprint!("Error {:?}", e);
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
    provider: Provider<Http>,
    contract: Contract<Provider<Http>>,
) -> Result<Proof> {
    let address_str = "1234567890abcdef1234567890abcdef12345678";
    let address_bytes = hex::decode(address_str).expect("Decoding failed");
    let address_array: [u8; 20] = address_bytes.as_slice().try_into().expect("Invalid length");
    let mut padded_address = [0u8; 32];
    padded_address[12..].copy_from_slice(&address_array);

    let recipient: H256 = H256::from(padded_address);

    let amount_to_send = U256::from(1_000_000_000_000_000_000u64);

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
    Err(anyhow::anyhow!("Transacction receipt not found"))
}

async fn get_storage_slot(
    provider: Provider<Http>,
    contract: Contract<Provider<Http>>,
    block_number: BlockId,
) -> Result<EIP1186ProofResponse> {
    let key = contract
        .method::<_, U256>("messageId()", ())?
        .call()
        .await?;
    let slot = U256::zero();
    let mut encoded = [0u8; 60];
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

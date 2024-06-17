// SPDK-License-Identifier: MIT
pragma solidity >0.5.0 <0.8.21;

contract SparseMerkleTree { 

    uint constant STATE_MANAGER_CONTRACT_TREE_DEPTH = 32;
    // NOTE: this also ensures `STATE_MANAGER_count` will fit into 64-bits
    uint constant MAX_STATE_MANAGER_COUNT = 2**STATE_MANAGER_CONTRACT_TREE_DEPTH - 1;

    bytes32[STATE_MANAGER_CONTRACT_TREE_DEPTH] branch;
    uint256 state_count;

    bytes32[STATE_MANAGER_CONTRACT_TREE_DEPTH] zero_hashes;
    constructor()  {
        for (uint height = 0; height < STATE_MANAGER_CONTRACT_TREE_DEPTH - 1; height++)
            zero_hashes[height + 1] = sha256(abi.encodePacked(zero_hashes[height], zero_hashes[height]));
    }

    function get_root() external view returns (bytes32) {
            bytes32 node;
            uint size = state_count;
            for (uint height = 0; height < STATE_MANAGER_CONTRACT_TREE_DEPTH; height++) {
                if ((size & 1) == 1)
                    node = sha256(abi.encodePacked(branch[height], node));
                else
                    node = sha256(abi.encodePacked(node, zero_hashes[height]));
                size /= 2;
            }
            return sha256(abi.encodePacked(
                node,
                to_little_endian_64(uint64(state_count)),
                bytes24(0)
            ));
        }
    
    function get_state_count()  external view returns (bytes memory) {
        return to_little_endian_64(uint64(state_count));
    }

    function verifyProof(bytes32 leaf, bytes32[] calldata proof, bytes32 root) public {
       bytes32 computedHash = leaf;

       for(uint256 i=0; i<proof.length; i++) {
        
       }
    }
//    function deposit(
//         bytes calldata pubkey,
//         bytes calldata withdrawal_credentials,
//         bytes calldata signature,
//         bytes32 deposit_data_root
//     ) override external payable {
//         // Extended ABI length checks since dynamic types are used.
//         require(pubkey.length == 48, "DepositContract: invalid pubkey length");
//         require(withdrawal_credentials.length == 32, "DepositContract: invalid withdrawal_credentials length");
//         require(signature.length == 96, "DepositContract: invalid signature length");

//         // Check deposit amount
//         require(msg.value >= 1 ether, "DepositContract: deposit value too low");
//         require(msg.value % 1 gwei == 0, "DepositContract: deposit value not multiple of gwei");
//         uint deposit_amount = msg.value / 1 gwei;
//         require(deposit_amount <= type(uint64).max, "DepositContract: deposit value too high");

//         // Emit `DepositEvent` log
//         bytes memory amount = to_little_endian_64(uint64(deposit_amount));
//         // emit DepositEvent(
//         //     pubkey,
//         //     withdrawal_credentials,
//         //     amount,
//         //     signature,
//         //     to_little_endian_64(uint64(deposit_count))
//         // );

//         // Compute deposit data root (`DepositData` hash tree root)
//         bytes32 pubkey_root = sha256(abi.encodePacked(pubkey, bytes16(0)));
//         bytes32 signature_root = sha256(abi.encodePacked(
//             sha256(abi.encodePacked(signature[:64])),
//             sha256(abi.encodePacked(signature[64:], bytes32(0)))
//         ));
//         bytes32 node = sha256(abi.encodePacked(
//             sha256(abi.encodePacked(pubkey_root, withdrawal_credentials)),
//             sha256(abi.encodePacked(amount, bytes24(0), signature_root))
//         ));

//         // Verify computed and expected deposit data roots match
//         require(node == deposit_data_root, "DepositContract: reconstructed DepositData does not match supplied deposit_data_root");

//         // Avoid overflowing the Merkle tree (and prevent edge case in computing `branch`)
//         require(deposit_count < MAX_DEPOSIT_COUNT, "DepositContract: merkle tree full");

//         // Add deposit data root to Merkle tree (update a single `branch` node)
//         deposit_count += 1;
//         uint size = deposit_count;
//         for (uint height = 0; height < DEPOSIT_CONTRACT_TREE_DEPTH; height++) {
//             if ((size & 1) == 1) {
//                 branch[height] = node;
//                 return;
//             }
//             node = sha256(abi.encodePacked(branch[height], node));
//             size /= 2;
//         }
//         // As the loop should always end prematurely with the `return` statement,
//         // this code should be unreachable. We assert `false` just to be safe.
//         assert(false);
//     }

    function to_little_endian_64(uint64 value) internal pure returns (bytes memory ret) {
        ret = new bytes(8);
        bytes8 bytesValue = bytes8(value);
        // Byteswapping during copying to bytes.
        ret[0] = bytesValue[7];
        ret[1] = bytesValue[6];
        ret[2] = bytesValue[5];
        ret[3] = bytesValue[4];
        ret[4] = bytesValue[3];
        ret[5] = bytesValue[2];
        ret[6] = bytesValue[1];
        ret[7] = bytesValue[0];
    }
}
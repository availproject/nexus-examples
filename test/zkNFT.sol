pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../contracts/example/zknft/NFT.sol";
import "../contracts/example/zknft/NftPayment.sol";
import "../contracts/NexusProofManager.sol";
import "../contracts/interfaces/INexusProofManager.sol";
import "../contracts/example/mock/ERC20.sol";
import "../contracts/verification/zksync/StorageProof.sol";

import "../contracts/verification/zksync/SparseMerkleTree.sol";
import "../contracts/verification/zksync/ZKSyncDiamond.sol";
import "../contracts/example/mock/ERC721.sol";

contract ZKNFTTest is Test  { 
    NexusProofManager proofManager;
    NFTPayment paymentContract;
    MyNFT nftContract;
    ERC20Token erc20;

    bytes32[] dynamicPath;
    uint256 mintAmount = 1 ether;
    uint256 blockNumber = 123;
    bytes32 stateRoot = 0x118eabaae552430cdecf445736d2e57c5dbcf70c1688f053e70f0c3a6a80411f;
    bytes32 blockHash = 0x118eabaae552430cdecf445736d2e57c5dbcf70c1688f053e70f0c3a6a80411f;
    bytes32 appid = 0x3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d;
    function setUp() public { 
        address bob = vm.addr(2);
        erc20 = new ERC20Token("Avail","Avail");
        proofManager = new NexusProofManager(bytes32(uint256(100)));
        SparseMerkleTree smt = new SparseMerkleTree();
        ZKSyncDiamond zksyncDiamond = new ZKSyncDiamond(INexusProofManager(address(proofManager)), appid);
        StorageProofVerifier verifier = new StorageProofVerifier(IZkSyncDiamond(address(zksyncDiamond)), smt);
        nftContract = new MyNFT(bytes32(uint256(uint160(137))), bytes32(uint256(uint160(1337))), INexusProofManager(address(proofManager)),verifier);
        paymentContract = new NFTPayment(INexusProofManager(address(proofManager)), bob, address(nftContract));
        paymentContract.updatePrice(address(erc20), mintAmount);
    }

    function testPaymentWithoutFallback() public { 
        erc20.mint(address(this), 2* mintAmount);
        erc20.approve(address(paymentContract), 2*mintAmount);
        paymentContract.paymentWithoutFallback(
            0x04, 137, 2*mintAmount, address(erc20)
        );
        bytes32 val = paymentContract.getValueFromId(0);
        console.logBytes32(val);

        erc20.mint(address(this), 2* mintAmount);
        erc20.approve(address(paymentContract), 2*mintAmount);
        paymentContract.paymentWithoutFallback(
            0x04, 137, 2*mintAmount, address(erc20)
        );
        val = paymentContract.getValueFromId(1);
        console.logBytes32(val);
    }

    function testNexusStateManagerUpdate() public { 
        proofManager.updateNexusBlock(blockNumber, NexusProofManager.NexusBlock(stateRoot, blockHash));
    }

    function testStorageProof() public { 
        proofManager.updateNexusBlock(blockNumber, NexusProofManager.NexusBlock(stateRoot, blockHash));
        bytes32[] memory siblings;
        NexusProofManager.AccountState memory state = NexusProofManager.AccountState( 
             0x509248c5752f1898dfea0887e7617a84631e749a404a25e976c6d3883c789b3b,
             0xd62c0e6039b3b76b0c70301de2dee44f1f8d1335e7df9bd26fc3bdb6f33a2574,
             0x378f4888b185704cb8c8e86792838c2fed7f7d4bd58cd9e66b34050a9c42aad1,
             570,
             123
        );
 
        proofManager.updateChainState(blockNumber, siblings, appid, state);
        bytes memory rawData = hex"00000000000000000000000025bb6f94624236bed93de9f0910ddcb5380384890000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000002";
        MyNFT.Message memory message = MyNFT.Message(
            0x01,
            0x000000000000000000000000d4005491125246dc116b40fda693e888a0931183,
            rawData,
            36,
            1337
        );
        
        dynamicPath.push(bytes32(0xba5325838c32aa67257f995767d0a51bb9652e86b162dcc8fbb43b15cc5c7ae5));
        dynamicPath.push(bytes32(0x01de01ebbdc33833eb4e9049fa9bb20f0268737312999115a14d553c661a3b6c));
        dynamicPath.push(bytes32(0xc89cb40d1ae178bbc7e18800b0aa460f53a070d710c4c70ebc8731f0d3812e22));
        dynamicPath.push(bytes32(0xc631fffdfdbc27ed0e4f61bc50b799ee0d9b67d5e9cac886e703144e9572712d));
        dynamicPath.push(bytes32(0x4e1e5eb29f3378179f87112827a22ce510fd6b80b11d4ea70b8ca50414e1e67b));
        dynamicPath.push(bytes32(0xdd2ee4dcfdab21b5746de659fc8742cf5671520826ee90216e142b165c26eb3f));
        dynamicPath.push(bytes32(0xe01a1ba6f8acab9e567849199d1af48b883532a642724b269d824745f07d959a));
        dynamicPath.push(bytes32(0xbd4efdde3e1211ff26d4549887187e6b4ab232b718f4902e5e7ccf00493e7b68));
        dynamicPath.push(bytes32(0xdc9a374febf417a247dbf3974ca6b39344266105d9c93f32a9fa2301e6d19a98));
       
        StorageProof memory proof = StorageProof(
            123,
            0x6bc15F6C8abD245812C7eC650D4586b9B52Ae546,
            0xfaaf1897615a4d5824a81780f33dd422a304cae5e7b14f0f9215d1a3deeea9e2,
            0x7fc8e033e28402e82ae3c4a4e6d7d02ab3941505362bdb58c429a2ffc9870802,
            dynamicPath,
            581
        );
        nftContract.mintNFT(msg.sender,message,proof);
    }
    
}

// {
//   account: '0x6bc15F6C8abD245812C7eC650D4586b9B52Ae546',
//   path: [
//     '0xba5325838c32aa67257f995767d0a51bb9652e86b162dcc8fbb43b15cc5c7ae5',
//     '0x01de01ebbdc33833eb4e9049fa9bb20f0268737312999115a14d553c661a3b6c',
//     '0xc89cb40d1ae178bbc7e18800b0aa460f53a070d710c4c70ebc8731f0d3812e22',
//     '0xc631fffdfdbc27ed0e4f61bc50b799ee0d9b67d5e9cac886e703144e9572712d',
//     '0x4e1e5eb29f3378179f87112827a22ce510fd6b80b11d4ea70b8ca50414e1e67b',
//     '0xdd2ee4dcfdab21b5746de659fc8742cf5671520826ee90216e142b165c26eb3f',
//     '0xe01a1ba6f8acab9e567849199d1af48b883532a642724b269d824745f07d959a',
//     '0xbd4efdde3e1211ff26d4549887187e6b4ab232b718f4902e5e7ccf00493e7b68',
//     '0xdc9a374febf417a247dbf3974ca6b39344266105d9c93f32a9fa2301e6d19a98'
//   ],
//   key: '0xfaaf1897615a4d5824a81780f33dd422a304cae5e7b14f0f9215d1a3deeea9e2',
//   value: '0x7fc8e033e28402e82ae3c4a4e6d7d02ab3941505362bdb58c429a2ffc9870802',
//   index: 581
// }
// {
//   messageType: '0x01',
//   from: '0x000000000000000000000000d4005491125246dc116b40fda693e888a0931183',
//   data: '0x00000000000000000000000025bb6f94624236bed93de9f0910ddcb5380384890000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000002',
//   messageId: '36',
//   chainId: '1337'
// }
// Updating nexus state on nft chain
// 123 [] 3655ca59b7d566ae06297c200f98d04da2e8e89812d627bc29297c25db60362d {
//   statement: '509248c5752f1898dfea0887e7617a84631e749a404a25e976c6d3883c789b3b',
//   state_root: 'd62c0e6039b3b76b0c70301de2dee44f1f8d1335e7df9bd26fc3bdb6f33a2574',
//   start_nexus_hash: '378f4888b185704cb8c8e86792838c2fed7f7d4bd58cd9e66b34050a9c42aad1',
//   last_proof_height: 570,
//   height: 123
// } {
//   chainStateNumber: 123,
//   info: {
//     stateRoot: '0x118eabaae552430cdecf445736d2e57c5dbcf70c1688f053e70f0c3a6a80411f',
//     blockHash: '0x118eabaae552430cdecf445736d2e57c5dbcf70c1688f053e70f0c3a6a80411f'
//   },
//   response: {
//     account: {
//       statement: '509248c5752f1898dfea0887e7617a84631e749a404a25e976c6d3883c789b3b',
//       state_root: 'd62c0e6039b3b76b0c70301de2dee44f1f8d1335e7df9bd26fc3bdb6f33a2574',
//       start_nexus_hash: '378f4888b185704cb8c8e86792838c2fed7f7d4bd58cd9e66b34050a9c42aad1',
//       last_proof_height: 570,
//       height: 123
//     },
//     proof: [],
//     value_hash: '8d3afd3f69f5ea864d0ab6eea5d487a70955592c36eaa18c1d8a770569f3ca3d',
//     nexus_header: {
//       parent_hash: '3a196d65e8c58363793098ff2714df730a1b818034bcd592c0994e4a690b768d',
//       prev_state_root: '118eabaae552430cdecf445736d2e57c5dbcf70c1688f053e70f0c3a6a80411f',
//       state_root: '118eabaae552430cdecf445736d2e57c5dbcf70c1688f053e70f0c3a6a80411f',
//       avail_header_hash: '170c13eb14ccf4492ac010081826fafccee6c4d63deaf8ab8d75236d793070bb',
//       number: 573
//     }
//   }
// }
import { expect } from "chai";
//import { ethers } from "ethers";
import { ethers } from "hardhat";

import { encode } from "@ethereumjs/rlp";
import { BaseTrie } from "merkle-patricia-tree";

describe("NexusBridge", function () {
  let nexusBridge: any;
  let nexusProofManager: any;
  const chainId = 1;
  let accountTrieProof =
    "0xf9023eb90154f90151a0c98927b47b532f950c5d02c605e8878bde76b672b89e5013c37d8bcc1bf62608a01689b2a5203afd9ea0a0ca3765e4a538c7176e53eac1f8307a344ffc3c6176558080a0d3193770cae12b76e92e5312157211baddc8c69caa57d35eaef66443fc11e070a0504f9724866b41cf3aae6acbb69ef9b0f17c88369bc544a1af99ccb33de64df180a0634922e341ee955289c16ca6c71996a5698686d8b668dab7f427fb8dd3e675a1a04b29efa44ecf50c19b34950cf1d0f05e00568bcc873120fbea9a4e8439de0962a0d0a1bfe5b45d2d863a794f016450a4caca04f3b599e8d1652afca8b752935fd880a0bf9b09e442e044778b354abbadb5ec049d7f5e8b585c3966d476c4fbc9a181d28080a06efafcd911b2aa70c4766668551e5b1a3794dc6a54d3477d289910a840d5d1faa0e5c557a0ce3894afeb44c37f3d24247f67dc76a174d8cacc360c1210eef60a7680b873f871a023a4c93973b6d8ed7eb060c5f4057891ef24da802ae8391765379869c2ad71b280808080808080a07372a983a0de20e92a1c052edd24739cf422f976c6dde82ca44d603527d6a80180808080a01c0e6c47a321cc8a080c22a2f1188582d8327aba43faacfd1b3cadb32ca1ada4808080b870f86ea02061055ea920808012c78dfc3fd2714d5ce59f19b79b6147d59d69a3888a84f5b84bf84901850d4576fa00a04f84c0d7b0397d49b1660079667e300100ee3dc4f40f24b120b54176ab317937a00296d77dccf288c832e96beac04b4001305e8099269523d38145d390765d50f0";
  let stateRoot =
    "0x605c466b1adb0c209484176b89ba04a9cf46d2f6c45214674d7bfaa0ebda4240";
  let blockHash =
    "0x5f574db327c747d944da576c21506ac2a90dc8f19bbc55791642c5e40d3b100e";
  let address = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

  const storageProof =
    "0xf9032cb90214f90211a0fa5e2fd2d6e72c8e43b0ecbeb17a319100e1afbbdb29b63a697bcdbd4a76a2c9a06eb6224a9564b438ad325d0488179f5030a4326eef2ed1ac2d7519d4294174aba061ef152c381b12802824b71a91afc98c04a5b6e51d389fb9f2c05e5abe31b3e5a04e89079af75d215b6bc8b9da9d4004924c10f630376ad15c0a38aca26f72181aa041546186685e7844b9eb3e9aae302edd9e4bea2623126f7b6d1c960eb40c011ca0edd7174916748bfa8745eb7c7ae6d918407122e59528613c45378c4fb2ce754fa0fbcd97095a84dca96a677c8cecc8c896dc30873b04f26c75e9c178d0ca37e6aca0e0c78dc9d094e0862de0a5c9c985baf6559e2c40bec51992680b214bc6bb4f35a057ff5978a35d5ec99f026666883f5f027fde694459680ec6e57fc298e2e98186a0c9d21353484f8b32ef324257ad91a3ec3c38a7b8406e8a4f8ee4df36db357af9a0e6d922b0ba239623bb6e760dca22188040f4cc5a0ec67956f7a150caf572c960a0e8d15b5addd823945cf6fc4bfbbad157509404495f1837252b0ee02218968373a0d3296997569db72f2d654f637d919044d60780c9dd0b0991cfa7643d342a3923a0829e3a88a6375481ab9af6f12a2aacf1ce623d271db7aee004d554a0614429aaa0e1fbeb68483387d5bc0b5c55ed390b8fe3eeb317e1529ccaa9c7a41f0446d7a4a079f4c602db086d596a7a47dbcaaa6a0d6e75f1ccc8165907610e76c93abfbfe580b893f891a09f74f37bdf07e2d73e875c821a01a72ec9e3e5362cddcfa3521296476e6da1f880808080a038d9d8c71f2ce4639e7da19dc4c9d007e8b899611eea89b30c58963958b9e1a08080a0c50af823ddd4cfc519ce820f15c121ca41cdebf06b1c3ef90f864120f4aefc468080808080a0eb10e85ce708885e53342a886ef11efbe1d3594a12fa790df637d075eac860b18080b853f8518080808080a06faf57464a2fd95b0ab5ca730e0bcb746ddf4998391c1f0c25a1c7aecd71b4c8808080808080808080a070498144d3ce4caf58f156fda7f3056e5cb58bfca06621a384d441c6c691a2ae80aae99f3787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace88872386f26fc10000";
  const storgeAccount = "0xd35CCeEAD182dcee0F148EbaC9447DA2c4D449c4";
  const storageHash =
    "0xed339d10818912537ecff9846d024bbb91f43c025e0cf6bd9776170b11a77233";
  const storageSlot =
    "0x0000000000000000000000000000000000000000000000000000000000000002";

  before(async function () {
    const EVMStorageproof = await ethers.getContractFactory(
      "NexusProofManager"
    );
    nexusProofManager = await EVMStorageproof.deploy(chainId);
    const AvailToken = await ethers.getContractFactory("AvailToken");
    const availToken = await AvailToken.deploy();
    const NexusBridge = await ethers.getContractFactory("NexusBridge");
    nexusBridge = await NexusBridge.deploy();

    await nexusBridge.initialize(
      10,
      ethers.ZeroAddress,
      await availToken.getAddress(),
      address,
      address,
      await nexusProofManager.getAddress(),
      137
    );
  });

  // it("Pass: receiveMessage()", async () => {
  //   await expect(
  //     nexusProofManager.updateChainState(
  //       137,
  //       15000,
  //       2,
  //       accountTrieProof,
  //       stateRoot
  //     )
  //   ).to.not.reverted;

  //   await expect(
  //     nexusBridge.receiveMessage(
  //       {
  //         messageType: "0x01",
  //         from: ethers.zeroPadValue(address, 32),
  //         to: ethers.zeroPadValue(address, 32),
  //         originDomain: 1,
  //         destinationDomain: 2,
  //         data: "0x",
  //         messageId: "2",
  //       },
  //       accountTrieProof
  //     )
  //   ).to.not.reverted;
  // });

  it("Pass: receiveETH()", async () => {
    // mock transaction to send eth to contract
    await expect(
      nexusProofManager.updateChainState(
        137,
        15000,
        2,
        accountTrieProof,
        stateRoot
      )
    ).to.not.reverted;

    await expect(
      nexusBridge.sendETH(ethers.zeroPadValue(address, 32), {
        value: ethers.parseEther("1"),
      })
    );

    await expect(
      nexusBridge.receiveETH(
        {
          messageType: "0x02",
          from: ethers.zeroPadValue(address, 32),
          to: ethers.zeroPadValue(address, 32),
          originDomain: 1,
          destinationDomain: 2,
          data: ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "uint256"],
            [
              "0x4554480000000000000000000000000000000000000000000000000000000000",
              1000,
            ]
          ),
          messageId: "2",
        },
        accountTrieProof
      )
    ).to.revertedWith("sdfklmsnkl");
  });

  // it("Pass: receiveAVAIL()", async () => {
  //   await expect(
  //     nexusBridge.receiveAVAIL(
  //       {
  //         messageType: "0x02",
  //         from: ethers.zeroPadValue(address, 32),
  //         to: ethers.zeroPadValue(address, 32),
  //         originDomain: 1,
  //         destinationDomain: 2,
  //         data: ethers.AbiCoder.defaultAbiCoder().encode(
  //           ["bytes32", "uint256"],
  //           [ethers.ZeroHash, 1000]
  //         ),
  //         messageId: "0x0",
  //       },
  //       accountTrieProof
  //     )
  //   ).to.revertedWith("sfklnsl");
  // });
  it("Pass: sendMessage()", async () => {
    await expect(
      nexusBridge.sendMessage(
        ethers.zeroPadValue(address, 32),
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "uint256"],
          [ethers.ZeroHash, 1000]
        )
      )
    );
  });
});

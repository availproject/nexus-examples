import { expect } from "chai";
//import { ethers } from "ethers";
import { ethers } from "hardhat";

import { encode } from "@ethereumjs/rlp";
import { BaseTrie } from "merkle-patricia-tree";

describe("EVMStorageproof", function () {
  let evmStorageproofInstance: any;

  before(async function () {
    const EVMStorageproof = await ethers.getContractFactory("StorageProof");
    evmStorageproofInstance = await EVMStorageproof.deploy(1, 1337);
  });

  // it("should return the correct block hash", async function () {
  //   const expectedHash =
  //     "0x02e85b90321b819e8c530e9e050830754aba1157378312cf7a3218c1937298aa";
  //   const blockNumber = 500;
  //   const actualHash = await evmStorageproofInstance.getBlockHash(blockNumber);
  //   expect(actualHash).to.equal(expectedHash);
  // });

  // it("should verify against the state root", async function () {
  //   const blockNumber = 500;
  //   const block = await ethers.provider.getBlock(blockNumber);
  //   const stateRoot = block?.stateRoot;
  //   const account = "0x6aE5A61BF6067a2f30AC5e51d6b194D426b2F303";
  //   const proof = await ethers.provider.send("eth_getProof", [
  //     account,
  //     [],
  //     blockNumber,
  //   ]);
  //   console.log(proof);
  // });

  it("fetch proof and try again", async () => {
    // const provider = new ethers.AlchemyProvider(
    //   "homestead",
    //   "6mKLTOXCzi7zCWyre7bJnFzancfVY-9C"
    // );
    // const block = await provider.getBlock("latest");
    // console.log(block);
    // const stateRoot = block?.stateRoot;
    // const account = await provider.send("eth_getProof", [
    //   "0x6aE5A61BF6067a2f30AC5e51d6b194D426b2F303",
    //   [ethers.ZeroHash],
    //   "latest",
    // ]);
    // // Print the output to console
    // console.log(account);
    // });
    const block = {
      number: 19937942,
      hash: "0x42fe29bc237ea3e6dd1ca5f67a0cfb03b3a8aef39ed78bc645e06242877c2aa4",
      timestamp: 1716531959,
      parentHash:
        "0x63f72ac1bc364aa11808385a04b8d4efb81a385d58da7a57cd801767d4450c4d",
      parentBeaconBlockRoot:
        "0xb8fe294f81dcb677e5ac81ac2d0c251878ce04223cc5850cd736108fc5377155",
      nonce: "0x0000000000000000",
      difficulty: 0n,
      gasLimit: 30000000n,
      gasUsed: 18521763n,
      stateRoot:
        "0x5b9daa0669142764bddcf674a3d1b69c531fe7771d854afca3bef847d621de3a",
      receiptsRoot:
        "0x2afa3e3de6dad0fcfd0402489e3110d6c6c15af488e9a3402d4d2f11ef10191e",
      blobGasUsed: 262144n,
      excessBlobGas: 0n,
      miner: "0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326",
      prevRandao:
        "0x4196938077d9f7f5717ed9b1111f87a66d6c81d65c140ebff8ce99b4296e7aba",
      extraData: "0x407273796e636275696c646572",
      baseFeePerGas: 9131340987n,
    };
    const get_proof_Result = {
      address: "0x6ae5a61bf6067a2f30ac5e51d6b194d426b2f303",
      accountProof: [
        "0xf90211a051641e922d9d5215316a9c1f001c44c4547da00efb825d8d7e8798257b305f08a0f8b3677715724b1a47515a0e9608d13e241816cf99963f52e38262ee42bcaec9a0634dee8d5e275960fc6fc6a4e7d8eae1a94b08a0a65c6d39a8a225dd7041792da07cc04d22ed7afbef3a0540223a891002e6bc225096bcf6fb4975e7136b91b493a04bf9995406de8ccea1e2e8dc46eb1f9498a53c50859116d302f416d5f481b758a0b02520cab51f0f77c53d4990aa5464427ff51deb1ed48c230243dbd72164cf06a0b4f7d6924000ac84122625a26a22d3d357f56c0433ab4c275839caee0eb57106a03066186a036094dd967c987819f4c7bd37280aa2c611c5749b4c91462964b9a0a0a951bf08f018e88ab08affac7dd7b6b9e98714a361ccfebba01047bb9b07c037a08a6864c43b2dc30b78554e9f895b47c4ec0252ec7b10f2d8e04c47db716a7b74a0f81eb54118fc53fd858ccb8d1bcf022e887438a8303c6ef11ebc0cae2a5b54cca0a3a1ad057b09707ddad6696e1cb94a06440a9e92ccb28636a2dec063a60dd92aa0f4fe307541e81721452cc34cc026400e99d5bbad82757da02ddcdbffad230119a084c326c2ed2eeed5292ac4c61a39315d2ec37f01ff2c351621e8156316d1e9dba0bfc074bcd92b2d5b62361a8f2a88a589f1840bb3e0e5bb53117ad4ad46ecc1daa0c924499db8eb4ddaa5edf8410ede13a28f9a3f935fbeafe56a5f0ea76095fd4d80",
        "0xf90211a08b5dc1c7762ff5403b3e507c4cffefd3dde84a4f8bf05b383dabef0aabcfc509a0d462b7f75ee1264fad717dedf539f2f55975a747ec1446ff2d72c744db5a3016a00fc9d1d91ec6ab2ae1924fc01bbffeb95573655f7e7d5b436b3433e19196b99aa0841ebbc44866db5cb1b9a9b5ff1d1855f6aa10419296768132479b4847b3edb4a0af5424303e7eb9267fba9ae466aa2ef297341b24d2fe16383dc6bc4d0df2fbb6a07b8ee04f70acd0584a149ec95cb565809ed3b1c571e11f06c613f3d41226c7e1a043b49f6d968ab11dc9251579c8b76913123f2b33d3472234fbc606a34a29beffa020a6d150e7c7f6b183ec3cfa6714823bd84467d0e4aba783ae59295b96de05f9a0501bac1aca1d17ac93d6219f1f9a85967a64cf7e189a65eb4c63aca5af504379a0914ccebc2ab80a28e4a6d706e172997c9d7984c4e8a9998af67e5124030d8b89a07cfdc412de592862d9c7b7b20b9314c7e502967788282a37d7450419ca64886ca01b399a15c4a761ec0b5398abe3bb896e138bc0b2692f7ad6993bf37fd32d9ae4a0157061efd0773656bca9c3aed1e1640589fe8978040cee6c1d596d61aceca5a6a08c9029271d2fffdb0d6b0f16fa0878f5aa3f4205dbe34d236c54cd18b28640f4a0dcd4a8380e672956d143b8c2f89073c3114423fc09503d7ef51ae775feddcef9a0fa1380d5237b425695753567a8da23f8d6a4d2291c3398ab3a1a54092da7bcca80",
        "0xf90211a0eddc70ae2edf8ec3fb73dc16076180a5d879c6158bf04d6561149a432d593ea9a0f195ec217cda16686f89387dedcaeb6b936e8d675ed62b54b09d00537583b792a0c8ba0fbdc335ce8a36dc6628d0a920ec8233f33ccafe8771b0d32f14e114ff1ba0cd40ba1a6df22de84ac7b894c1c0565ea0bf1af8c381b67e8cf900399a93d3e2a0603011083a3f1d0ba96df878588a9dddc4e312675cb59f4efc24ff3fd0a1a4d2a0a102cbc6b3eb9ca6b1afb6cc819e5d5ba3bd11b3ba50c8929907ef376c0aabe9a00f0118b37d8552ff1cf331cf99edc6b40441fc2b3f10c735fb7a93606848c3c8a03350a8f0677de738fdf44bf527b870190dda8f76d1c40d2cf5ceb93a7f8331e0a0e07a534826012c9d54b03b4f7363b85ff5b83ffff9a781367e76dd9808643953a075b3b35167a4968305779115ac5002e82b50516958849f9328dd140926047a3ba04d960aba7ee12322e626186e9ec07088aaa9b28a8f2369ab324eb69e03f4910ba06caa8cb060084811c9614d7d6cdd3a7d6d53b74d10ab564334d42d754a958362a05b2426a1b00afdcec0e1c57baa5d27895e2905fa1c5c1f14372bbee0070e5828a06a4ae827fc17f47a57499cd8de9d29169cf1d29d9cea97c09d2622d282a2f12ba0227d5a02cc510ee4aeaef43b9905c77a0569720a6e396abf3f02afb5c3755222a06f55bb1ab3449f38a3f0d8c11472cf003054c8195ced213eeeb1a86bc3a1a3da80",
        "0xf90211a0f5daef79a89dd049fe511e9f79e860750c7863a90f48aaed72ccd234b0535847a06aba7627a99fe72d14e3a34133f8656d76bc226c5806275db08f67e55d5ff71aa07f0f99bc3d0d382a69a6531b862508ffe8a0093ae260e9c3c65b3dbb886862b9a0ff006b91769bb626bd20e49602a13b2b1d68bdd3cef1102febc281ad02088463a05a54e1d230ea509147555293f9ee6462996c678ee33283d42a588db3b7944616a0763557fc0450106848afb6bbb139e20bd507107dc90cff0bfec7d04f38fe7239a00408d6a50714f147f12efb6193855525abfb0b7f5e2482d6505f9d4ca6d2467ca05c1230490d500d6a762dae15667d8b53d345273565e5a64a48d03b0387c3e95ca0fffdc26cffe6a82abf82cbbcacd2ed484123d8e9965a66bd5400b5a9e8d4ece9a097835b96262e5521b69e361b4dc10b8e387a1be4326638a418dd34a15b016b47a09ea93f1f1b1256a37eab5918a7058fa55feae6138305c8c9a12ac4e4b09249f4a0adb926e9c0218aa2e74b81ce21cf19f14385d9f5a2c51476af4d212e394c626fa096b2fe94b1b99780a9ad44ef3ff14fdf144fe509ebb4020cc0f9a5c52b855974a03cc65b4a73663aab6b284929bbb7439711d708b9c5232e0d24a1ee5d94224d8aa0d4be73af4b8ed08a55c582813dfe49d5b9acad3383442ac5295a6130480e24b5a0e1aeb0600165d739b34cbab515d0fb5997624f12e5aa1a6f6666f2c0c2a697db80",
        "0xf90211a07880e2773f0e99a70856a71fdb8e64e25cdacd1d9a1f1bdb268413740145de81a06f3ea6b0c3dbad29347d83b764cd0c90dc86853992f12bc3f0532835a7fa6db9a0f71a245d9e28fd1c11553be02030092c33606867eaa3806596ef448d6169a512a038a765bb6bcc1e3f3f1dd1b12dfa6b0dc7c47e8afd0bc41a545491fa2ba08e57a0a9a3e95d255800c13024cdfb98b601c416ceedbe306af202e5f5e973d401e65ea064d01d7f9ecff1e0dd0286eed1da96303e38e1800f96d8d3dffd0d8a5e45e97ea050f3ee98e66e81715eb1ee9b6a9c525fc32292eff9135ea580b08387dc96cc13a0df148fff5e8c2ff46d485360f4ad5f1efb3a8bdf1355b4a50dabd7fee8c871fda0db0d06557586e5312bc440ff9d8164a8f29880e2ee2eedca406723f3da156604a06cbc5e5105464d48b1025088a5fe1a1dd232b0c9ff3bd1d9d2432a8a6ac7db6ca0e3abbc519a55a72ea97b838ca78e21dbe7fdfe0b3885cc73a51c993b23e42376a07fc5eb98c3af56245b1f887e287daa493c0d9985b933283e795b6256e8b04bcfa08d216585ffad41c6f935828953e935539be71b751bc4e642fa18fbba53ff28c9a0fa07378dcf1521d6b78f78cdb682aed466f83da608f3acc38286831a7fd6f8d6a0b5b119e2318b8496853e2dc6d2c60fd57be045fc00b03800cac29725e7d8c04fa09c666a8a9e50d7f7adc4c78db0eaf39a078f16da21a1407f4f8187a639d20ac880",
        "0xf90211a0f6fdf2d092ce4eb5522ad73742f5d8a99e8a205686e0d24271549132534315efa04cba064073f4b9b43ace0e6a4d157074e5a864b5fd26a307d14792d37376cc0da0960b27ba3ce81487bb57c405d85709beb18391e45850fab9bc43a79c52242e03a092f1b94431d59a138aac9754dd363f02fbb8a50e336a743a26422bdf89b6d606a044c224bd01ac8b245f045ce3918030fab0aa9875a57af97f9f2afe8fc4ad49faa0afda344223083c9a11ed0f87996a5374fa1f33a47d7885c44870454b0795d1f3a031f3bc41915061e7062ea519c5ef028bd4ee79d92ec9cad0d88e7ad12edcb146a07ab3a4f16057c0b7db3c22804e1dcb19676bbbb64536766630ad5d13411f77b1a0078c6874837b5152e33568cb71d10630e3fb93db39c6bb26eaa5c1b8e217e6f6a00009a255a6f727ee88e8a8648db7a00af7c446ed3890a10ad6465c1a8969a4e6a0b3f4dde837480fb8e2fcd70ca3cb2507f00b0bfab24810d2afc44341592c9b55a0e55b8d93adf7c429143595ef9478a2ff59e6dc67a594723ef317f9d00ceed354a08738a4d455f492111eabbd35684d59432ff5660ebeba0acaa62ef266785e1e54a0acb23f5ebc4376d4c8f1bb7a44ceceafa6ed4952fe638bec0be0c99f7f04705fa06088bd46643fe8ef39eefc28a3c51d8e685349a6cafb30f2afda65c50e32ae1ca0aa6a127259905e42f96ddc134294814aad83e36843b402c9fa7c586b57ff40e080",
        "0xf9013180808080a0777e54f5c22ebebec844ff9e71e48f90709cb17c9cda461508e347c42be4b6fea0bf26362112a9eda6bd7f2d3ce6a4ed20b15a3027f060ea37566c7fc68c588551a0abb0f26de88c81d5d8e9417691f7200d204a15c8a2cd8b8223abf9964033bf7880a0f9a4b71b901cf26585bc489bc7a26fb2a61f8ade3dc66c38ead173a72a2958daa03ec1b99eb4bdbe984470bdc02cd957b699e88640f8c2c134e1f871cad0e3187aa024821e4e7a8efa7a692747864513f86eae95c64cdd922fdb0680e98688649ce0a00d2602d77530fcd3205d004297314d80c6bd5450a63cb6151a676d7a813e20b080a0f5efa394a894a4d235f5e69be6e7a986739f49210dcf5973bab39211b7840d6f80a0505bd499d2afc9337e6ee36714c186e6a84c18f002774705a4eaea83c0d7890780",
        "0xf8669d3067daceb6673b3f187665ea6ab7aa027d4df01df6ac7ace0556dd0f4db846f8440180a04bb057e5e99169693dcf3feefe1beaabab2ccd8b33b8fcdf49590f5d2ced5535a042df14dc567582fc706a3a3c17f3368ebc561b297ee4bf9456dba3830b99c97c",
      ],
      balance: "0x0",
      codeHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      nonce: "0x0",
      storageHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      storageProof: [
        {
          key: "0x0000000000000000000000000000000000000000000000000000000000000000",
          value: "0x0",
          proof: [],
        },
      ],
    };

    let concatenatedProof = get_proof_Result.accountProof
      .map((proof) => proof.slice(2))
      .join("");
    await evmStorageproofInstance.verifyAccount(
      block.stateRoot,
      "0x" + concatenatedProof,
      get_proof_Result.address
    );
    // it("should return the correct slot value", async function () {
    //   const keccak256 = ethers.keccak256;
    //   const toUtf8Bytes = ethers.toUtf8Bytes;
    //   const storageRoot = keccak256(toUtf8Bytes("storageRoot"));
    //   const slot = keccak256(toUtf8Bytes("slot"));
    //   const slotValue = keccak256(toUtf8Bytes("value"));
    //   const trie = new BaseTrie();
    //   // Put the slot and slotValue into the trie
    //   await trie.put(
    //     Buffer.from(slot.slice(2), "hex"),
    //     Buffer.from(slotValue.slice(2), "hex")
    //   );
    //   // Create the proof for the slot
    //   const proof = await BaseTrie.createProof(
    //     trie,
    //     Buffer.from(slot.slice(2), "hex")
    //   );
    //   // Encode the proof into a hex string
    //   const storageSlotTrieProof =
    //     "0x" + proof.map((n) => n.toString("hex")).join("");
    //   // Call the contract function to verify the storage
    //   const returnedSlotValue = await evmStorageproofInstance.verifyStorage(
    //     storageRoot,
    //     slot,
    //     storageSlotTrieProof
    //   );
    //   console.log("Slot Value:", returnedSlotValue);
    //   // Verify that the returned slot value matches the expected slot value
    //   expect(returnedSlotValue).to.equal(slotValue);
  });
});

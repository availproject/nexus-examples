import 'hardhat-typechain'
import '@nomiclabs/hardhat-ethers'
import '@matterlabs/hardhat-zksync-deploy'
import '@matterlabs/hardhat-zksync-solc'
import '@matterlabs/hardhat-zksync-ethers'
import '@nomiclabs/hardhat-etherscan'
// import '@nomiclabs/hardhat-waffle'

import 'hardhat-contract-sizer'

export default {
  zksyncEthers: {},
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    arbitrumRinkeby: {
      url: `https://arbitrum-rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    arbitrum: {
      url: `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    optimismKovan: {
      url: `https://optimism-kovan.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    optimism: {
      url: `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    polygon: {
      url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
    },
    bnb: {
      url: `https://bsc-dataseed.binance.org/`,
    },
    zkSync1: {
      url: 'https://zksync1.nexus.avail.tools',
      accounts: ['0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6'],
      chainId: 271,
      zksync: true,
      ethNetwork: 'sepolia',
    },
    zkSync2: {
      url: 'https://zksync2.nexus.avail.tools',
      accounts: ['0x5090c024edb3bdf4ce2ebc2da96bedee925d9d77d729687e5e2d56382cf0a5a6'],
      chainId: 272,
      zksync: true,
      ethNetwork: 'sepolia',
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  zksolc: {
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
        mode: 'z',
      },
        libraries: {
              "contracts/libraries/Nexus.sol": {
                "Nexus": "0x22D5437C1e2E27E1797Ec80aef3360b4c5165160"
              }
            }
    },
  },
  solidity: {
    contractSizer: {
      alphaSort: true,
      disambiguatePaths: false,
      runOnCompile: true,
      strict: true,
    },
    compilers: [
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          metadata: {
            bytecodeHash: 'none',
          },
        },
      },
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          metadata: {
            bytecodeHash: 'none',
          },
        },
      },
    ],
    overrides: {
      'contracts/libraries/TickBitmap.sol': {
        version: '0.7.6',
      },
      'contracts/libraries/BitMath.sol': {
        version: '0.7.6',
      },
      'contracts/libraries/Position.sol': {
        version: '0.7.6',
      },
      'contracts/libraries/SqrtPriceMath.sol': {
        version: '0.7.6',
      },
    },
  },
}

import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-contract-sizer';
import 'solidity-coverage';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import '@nomiclabs/hardhat-etherscan';

require('dotenv').config();

export default {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: '0.7.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  // contractSizer: {
  //   alphaSort: true,
  //   runOnCompile: true,
  //   disambiguatePaths: false,
  // },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  typechain: {
    outDir: 'types/',
    target: 'ethers-v5',
  },
  networks: {
    hardhat: {
      // forking: {
      //   url: process.env.MAIN_NET_API_URL,
      // },
      hardfork: 'london',
      gasPrice: 'auto',
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    kovan: {
      url: process.env.KOVAN_NET_API_URL,
      accounts: [process.env.PRIVATE_KEY],
      saveDeployments: true,
    },
    rinkeby: {
      url: process.env.RINKEBY_NET_API_URL,
      accounts: [process.env.PRIVATE_KEY],
      saveDeployments: true,
    },
  },
  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    imports: 'imports',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 100000,
  },
};

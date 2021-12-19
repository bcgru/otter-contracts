require('@nomiclabs/hardhat-waffle')
require('@atixlabs/hardhat-time-n-mine')
require('@nomiclabs/hardhat-etherscan')

const fs = require('fs')
const dev = fs.readFileSync('.secret').toString().trim()

//deployer's pk
const deployer = fs.readFileSync('.secret.mainnet').toString().trim()
// const etherscanApiKey = fs.readFileSync('.secret.etherscan').toString().trim()

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
      },
      {
        version: '0.7.5',
      },
      {
        version: '0.5.16', // for uniswap v2
      },
    ],
  },
  networks: {
    'polygon-mainnet': {
      url: 'https://polygon-rpc.com',
      accounts: [deployer],
      gasPrice: 35000000000,
      gas: 20000000,
    },
    'bsc-main': {
      url: 'https://bsc.getblock.io/mainnet/?api_key=adb27e2e-7dac-476d-bb13-c6af6b360b7b',
      accounts: [deployer],
      gasPrice: 35000000000,
      gas: 20000000,
    },
    'bsc-test': {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      accounts: { mnemonic: dev },
      chainId: 97,
      gas: 20000000,
      gasPrice: 20000000000
    },
    hardhat: {
      gas: 'auto',
    },
  },
  mocha: {
    timeout: 5 * 60 * 10000,
  }
}

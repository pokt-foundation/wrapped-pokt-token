const { deploy } = require('./buidler/cli')
require('dotenv').config()

require('@nomiclabs/hardhat-etherscan')
require('@nomiclabs/hardhat-truffle5')

task('deploy', 'Deploy wPOKT')
  .addParam('minter', 'wPOKT minter')
  .setAction(deploy)

const accounts = [process.env.DEV_PK]

module.exports = {
  networks: {
    // Mainnet network configured with Aragon node.
    mainnet: {
      url: 'https://mainnet.eth.aragon.network',
    },
    // Rinkeby network configured with Aragon node.
    rinkeby: {
      url: 'https://rinkeby.eth.aragon.network',
      accounts,
    },
    kovan: {
      url: 'https://poa-kovan.gateway.pokt.network/v1/lb/61a4bf7a541b7a0039f10001',
      accounts,
    },
    // Network configured to interact with Frame wallet. Requires
    // to have Frame running on your machine. Download it from:
    // https://frame.sh
    frame: {
      httpHeaders: { origin: 'hardhat' },
      url: 'http://localhost:1248',
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  solidity: {
    version: '0.5.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
}

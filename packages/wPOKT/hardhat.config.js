const { deploy } = require('./buidler/cli')

require('@nomiclabs/hardhat-etherscan')
require('@nomiclabs/hardhat-truffle5')

task('deploy', 'Deploy wPOKT')
  .addParam('minter', 'wPOKT minter')
  .setAction(deploy)

module.exports = {
  networks: {
    // Mainnet network configured with Aragon node.
    mainnet: {
      url: 'https://mainnet.eth.aragon.network',
    },
    // Rinkeby network configured with Aragon node.
    rinkeby: {
      url: 'https://rinkeby.eth.aragon.network',
    },
    kovan: {
      url: 'https://poa-kovan.gateway.pokt.network/v1/lb/61a4bf7a541b7a0039f10001',
    },
    // Network configured to interact with Frame wallet. Requires
    // to have Frame running on your machine. Download it from:
    // https://frame.sh
    frame: {
      httpHeaders: { origin: 'hardhat' },
      url: 'http://localhost:1248',
    }
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

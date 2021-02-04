const inquirer = require('inquirer')
const { calculateContractAddress } = require('./utils')

async function deploy({ owner }) {
  if (!web3.utils.isAddress(owner)) {
    console.log('Error: --owner must be an Ethereum address')
    return
  }

  const wPOKT = artifacts.require('wPOKT')

  const from = (await web3.eth.getAccounts())[0].toLowerCase()
  const currentNonce = await web3.eth.getTransactionCount(from)
  const wpoktAddr = calculateContractAddress(from, currentNonce)

  console.log('Deploying wPOKT')
  console.log()
  console.log('Deploying from address:', web3.utils.toChecksumAddress(from))
  console.log()
  console.log('wPOKT address:', web3.utils.toChecksumAddress(wpoktAddr))
  console.log()

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: 'Continue?',
  }])

  if (confirmed) {
    await wPOKT.new(migratorAddr)

    const deployedwPOKT = await wPOKT.at(wpoktAddr)

    console.log()
    console.log('wPOKT minter:', await deployedwPOKT.minter())
    console.log()

    console.log('Complete!')
  }
}

module.exports = {
  deploy
}

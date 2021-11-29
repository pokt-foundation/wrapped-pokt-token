const { ecsign, ecrecover } = require('ethereumjs-util')
const { keccak256 } = require('web3-utils')
const truffleAssert = require('truffle-assertions')
const { bn, MAX_UINT256, ZERO_ADDRESS } = require('@aragon/contract-helpers-test')
const { assertBn, assertEvent, assertRevert } = require('@aragon/contract-helpers-test/src/asserts')
const { createDomainSeparator } = require('./helpers/erc712')
const { createPermitDigest, PERMIT_TYPEHASH } = require('./helpers/erc2612')
const { createTransferWithAuthorizationDigest, TRANSFER_WITH_AUTHORIZATION_TYPEHASH } = require('./helpers/erc3009')
const { tokenAmount } = require('./helpers/tokens')

const wPOKT = artifacts.require('wPOKT')

contract('wPOKT', ([_, minter, newMinter, holder1, holder2, newHolder]) => {
  let wpokt

  async function itTransfersCorrectly(fn, { from, to, value }) {
    const isMint = from === ZERO_ADDRESS
    const isBurn = to === ZERO_ADDRESS

    const prevFromBal = await wpokt.balanceOf(from)
    const prevToBal = await wpokt.balanceOf(to)
    const prevSupply = await wpokt.totalSupply()

    const receipt = await fn(from, to, value)

    if (isMint) {
      assertBn(await wpokt.balanceOf(to), prevToBal.add(value), 'mint: to balance')
      assertBn(await wpokt.totalSupply(), prevSupply.add(value), 'mint: total supply')
    } else if (isBurn) {
      assertBn(await wpokt.balanceOf(from), prevFromBal.sub(value), 'burn: from balance')
      assertBn(await wpokt.totalSupply(), prevSupply.sub(value), 'burn: total supply')
    } else {
      assertBn(await wpokt.balanceOf(from), prevFromBal.sub(value), 'transfer: from balance')
      assertBn(await wpokt.balanceOf(to), prevToBal.add(value), 'transfer: to balance')
      assertBn(await wpokt.totalSupply(), prevSupply, 'transfer: total supply')
    }

    assertEvent(receipt, 'Transfer', { expectedArgs: { from, to, value } })
  }

  async function itApprovesCorrectly(fn, { owner, spender, value }) {
    const receipt = await fn(owner, spender, value)

    assertBn(await wpokt.allowance(owner, spender), value, 'approve: allowance')
    assertEvent(receipt, 'Approval', { expectedArgs: { owner, spender, value } })
  }

  beforeEach('deploy wPOKT', async () => {
    wpokt = await wPOKT.new(minter)

    await wpokt.mint(holder1, tokenAmount(100), { from: minter })
    await wpokt.mint(holder2, tokenAmount(200), { from: minter })
  })

  it('set up the token correctly', async () => {
    assert.equal(await wpokt.name(), 'Wrapped POKT Token', 'token: name')
    assert.equal(await wpokt.symbol(), 'wPOKT', 'token: symbol')
    assert.equal(await wpokt.decimals(), '6', 'token: decimals')

    assertBn(await wpokt.totalSupply(), tokenAmount(300))
    assertBn(await wpokt.balanceOf(holder1), tokenAmount(100))
    assertBn(await wpokt.balanceOf(holder2), tokenAmount(200))
  })

  context('mints', () => {
    context('is minter', () => {
      it('can mint tokens', async () => {
        await itTransfersCorrectly(
          (_, to, value) => wpokt.mint(to, value, { from: minter }),
          {
            from: ZERO_ADDRESS,
            to: newHolder,
            value: tokenAmount(100)
          }
        )
      })

      it('can change minter', async () => {
        const receipt = await wpokt.changeMinter(newMinter, { from: minter })

        assert.equal(await wpokt.minter(), newMinter, 'minter: changed')
        assertEvent(receipt, 'ChangeMinter', { expectedArgs: { minter: newMinter } })
      })
    })

    context('not minter', () => {
      it('cannot mint tokens', async () => {
        await truffleAssert.fails(wpokt.mint(newHolder, tokenAmount(100), { from: holder1 }), 'wPOKT:NOT_MINTER')
      })

      it('cannot change minter', async () => {
        await truffleAssert.fails(wpokt.changeMinter(newMinter, { from: holder1 }), 'wPOKT:NOT_MINTER')
      })
    })
  })

  context('transfers', () => {
    context('holds bag', () => {
      it('can transfer tokens', async () => {
        await itTransfersCorrectly(
          (from, to, value) => wpokt.transfer(to, value, { from }),
          {
            from: holder1,
            to: newHolder,
            value: (await wpokt.balanceOf(holder1)).sub(tokenAmount(1))
          }
        )
      })

      it('can transfer all tokens', async () => {
        await itTransfersCorrectly(
          (from, to, value) => wpokt.transfer(to, value, { from }),
          {
            from: holder1,
            to: newHolder,
            value: await wpokt.balanceOf(holder1)
          }
        )
      })

      it('cannot transfer above balance', async () => {
        await truffleAssert.fails(
          wpokt.transfer(newHolder, (await wpokt.balanceOf(holder1)).add(bn('1')), { from: holder1 }),
          'MATH:SUB_UNDERFLOW'
        )
      })

      it('cannot transfer to token', async () => {
        await truffleAssert.fails(
          wpokt.transfer(wpokt.address, bn('1'), { from: holder1 }),
          'wPOKT:RECEIVER_IS_TOKEN_OR_ZERO'
        )
      })

      it('cannot transfer to zero address', async () => {
        await truffleAssert.fails(
          wpokt.transfer(ZERO_ADDRESS, bn('1'), { from: holder1 }),
          'wPOKT:RECEIVER_IS_TOKEN_OR_ZERO'
        )
      })
    })

    context('bagless', () => {
      it('cannot transfer any', async () => {
        await truffleAssert.fails(
          wpokt.transfer(holder1, bn('1'), { from: newHolder }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })
  })

  context('approvals', () => {
    const owner = holder1
    const spender = newHolder

    context('has allowance', () => {
      const value = tokenAmount(50)

      beforeEach(async () => {
        await wpokt.approve(spender, value, { from: owner })
      })

      it('can change allowance', async () => {
        await itApprovesCorrectly(
          (owner, spender, value) => wpokt.approve(spender, value, { from: owner }),
          { owner, spender, value: value.add(tokenAmount(10)) }
        )
      })

      it('can transfer below allowance', async () => {
        await itTransfersCorrectly(
          (from, to, value) => wpokt.transferFrom(from, to, value, { from: spender }),
          {
            from: owner,
            to: spender,
            value: value.sub(tokenAmount(1))
          }
        )
      })

      it('can transfer all of allowance', async () => {
        await itTransfersCorrectly(
          (from, to, value) => wpokt.transferFrom(from, to, value, { from: spender }),
          {
            from: owner,
            to: spender,
            value: value.sub(tokenAmount(1))
          }
        )
      })

      it('cannot transfer above balance', async () => {
        await truffleAssert.fails(
          wpokt.transferFrom(owner, spender, value.add(bn('1')), { from: spender }),
          'MATH:SUB_UNDERFLOW'
        )
      })

      it('cannot transfer to token', async () => {
        await truffleAssert.fails(
          wpokt.transferFrom(owner, wpokt.address, bn('1'), { from: spender }),
          'wPOKT:RECEIVER_IS_TOKEN_OR_ZERO'
        )
      })

      it('cannot transfer to zero address', async () => {
        await truffleAssert.fails(
          wpokt.transferFrom(owner, ZERO_ADDRESS, bn('1'), { from: spender }),
          'wPOKT:RECEIVER_IS_TOKEN_OR_ZERO'
        )
      })
    })

    context('has infinity allowance', () => {
      beforeEach(async () => {
        await wpokt.approve(spender, MAX_UINT256, { from: owner })
      })

      it('can change allowance', async () => {
        await itApprovesCorrectly(
          (owner, spender, value) => wpokt.approve(spender, value, { from: owner }),
          { owner, spender, value: tokenAmount(10) }
        )
      })

      it('can transfer without changing allowance', async () => {
        await itTransfersCorrectly(
          (from, to, value) => wpokt.transferFrom(from, to, value, { from: spender }),
          {
            from: owner,
            to: spender,
            value: await wpokt.balanceOf(owner)
          }
        )

        assertBn(await wpokt.allowance(owner, spender), MAX_UINT256, 'approve: stays infinity')
      })

      it('cannot transfer above balance', async () => {
        await truffleAssert.fails(
          wpokt.transferFrom(owner, spender, (await wpokt.balanceOf(owner)).add(bn('1')), { from: spender }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })

    context('no allowance', () => {
      it('can increase allowance', async () => {
        await itApprovesCorrectly(
          (owner, spender, value) => wpokt.approve(spender, value, { from: owner }),
          { owner, spender, value: tokenAmount(10) }
        )
      })

      it('cannot transfer', async () => {
        await truffleAssert.fails(
          wpokt.transferFrom(owner, spender, bn('1'), { from: spender }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })
  })

  context('burns', () => {
    context('holds bag', () => {
      it('can burn tokens', async () => {
        await itTransfersCorrectly(
          (from, to, value) => wpokt.burn(value, { from }),
          {
            from: holder1,
            to: ZERO_ADDRESS,
            value: (await wpokt.balanceOf(holder1)).sub(tokenAmount(1))
          }
        )
      })

      it('can burn all tokens', async () => {
        await itTransfersCorrectly(
          (from, to, value) => wpokt.burn(value, { from }),
          {
            from: holder1,
            to: ZERO_ADDRESS,
            value: await wpokt.balanceOf(holder1)
          }
        )
      })

      it('cannot burn above balance', async () => {
        await truffleAssert.fails(
          wpokt.burn((await wpokt.balanceOf(holder1)).add(bn('1')), { from: holder1 }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })

    context('bagless', () => {
      it('cannot burn any', async () => {
        await truffleAssert.fails(
          wpokt.burn(bn('1'), { from: newHolder }),
          'MATH:SUB_UNDERFLOW'
        )
      })
    })

    it('can burn all tokens', async () => {
      await itTransfersCorrectly(
        (from, to, value) => wpokt.burn(value, { from }),
        {
          from: holder1,
          to: ZERO_ADDRESS,
          value: await wpokt.balanceOf(holder1)
        }
      )
      await itTransfersCorrectly(
        (from, to, value) => wpokt.burn(value, { from }),
        {
          from: holder2,
          to: ZERO_ADDRESS,
          value: await wpokt.balanceOf(holder2)
        }
      )

      assertBn(await wpokt.totalSupply(), 0, 'burn: no total supply')
    })
  })

  context('ERC-712', () => {
    it('has the correct ERC712 domain separator', async () => {
      const domainSeparator = createDomainSeparator(
        await wpokt.name(),
        bn('1'),
        await wpokt.getChainId(),
        wpokt.address
      )
      assert.equal(await wpokt.getDomainSeparator(), domainSeparator, 'erc712: domain')
    })
  })

  context('ERC-2612', () => {
    let owner, ownerPrivKey
    const spender = newHolder

    async function createPermitSignature(owner, spender, value, nonce, deadline) {
      const digest = await createPermitDigest(wpokt, owner, spender, value, nonce, deadline)

      const { r, s, v } = ecsign(
        Buffer.from(digest.slice(2), 'hex'),
        Buffer.from(ownerPrivKey.slice(2), 'hex')
      )

      return { r, s, v }
    }

    before(async () => {
      const wallet = web3.eth.accounts.create('erc2612')
      owner = wallet.address
      ownerPrivKey = wallet.privateKey
    })

    beforeEach(async () => {
      await wpokt.mint(owner, tokenAmount(50), { from: minter })
    })

    it('has the correct permit typehash', async () => {
      assert.equal(await wpokt.PERMIT_TYPEHASH(), PERMIT_TYPEHASH, 'erc2612: typehash')
    })

    it('can set allowance through permit', async () => {
      const deadline = MAX_UINT256

      const firstValue = tokenAmount(100)
      const firstNonce = await wpokt.nonces(owner)
      const firstSig = await createPermitSignature(owner, spender, firstValue, firstNonce, deadline)
      const firstReceipt = await wpokt.permit(owner, spender, firstValue, deadline, firstSig.v, firstSig.r, firstSig.s)

      assertBn(await wpokt.allowance(owner, spender), firstValue, 'erc2612: first permit allowance')
      assertBn(await wpokt.nonces(owner), firstNonce.add(bn(1)), 'erc2612: first permit nonce')
      assertEvent(firstReceipt, 'Approval', { expectedArgs: { owner, spender, value: firstValue } })

      const secondValue = tokenAmount(500)
      const secondNonce = await wpokt.nonces(owner)
      const secondSig = await createPermitSignature(owner, spender, secondValue, secondNonce, deadline)
      const secondReceipt = await wpokt.permit(owner, spender, secondValue, deadline, secondSig.v, secondSig.r, secondSig.s)

      assertBn(await wpokt.allowance(owner, spender), secondValue, 'erc2612: second permit allowance')
      assertBn(await wpokt.nonces(owner), secondNonce.add(bn(1)), 'erc2612: second permit nonce')
      assertEvent(secondReceipt, 'Approval', { expectedArgs: { owner, spender, value: secondValue } })
    })

    it('cannot use wrong signature', async () => {
      const deadline = MAX_UINT256
      const nonce = await wpokt.nonces(owner)

      const firstValue = tokenAmount(100)
      const secondValue = tokenAmount(500)
      const firstSig = await createPermitSignature(owner, spender, firstValue, nonce, deadline)
      const secondSig = await createPermitSignature(owner, spender, secondValue, nonce, deadline)

      // Use a mismatching signature
      await truffleAssert.fails(wpokt.permit(owner, spender, firstValue, deadline, secondSig.v, secondSig.r, secondSig.s), 'wPOKT:INVALID_SIGNATURE')
    })

    it('cannot use expired permit', async () => {
      const value = tokenAmount(100)
      const nonce = await wpokt.nonces(owner)

      // Use a prior deadline
      const now = bn((await web3.eth.getBlock('latest')).timestamp)
      const deadline = now.sub(bn(60))

      const { r, s, v } = await createPermitSignature(owner, spender, value, nonce, deadline)
      await truffleAssert.fails(wpokt.permit(owner, spender, value, deadline, v, r, s), 'wPOKT:AUTH_EXPIRED')
    })

    it('cannot use surpassed permit', async () => {
      const deadline = MAX_UINT256
      const nonce = await wpokt.nonces(owner)

      // Generate two signatures with the same nonce and use one
      const firstValue = tokenAmount(100)
      const secondValue = tokenAmount(500)
      const firstSig = await createPermitSignature(owner, spender, firstValue, nonce, deadline)
      const secondSig = await createPermitSignature(owner, spender, secondValue, nonce, deadline)

      // Using one should disallow the other
      await wpokt.permit(owner, spender, secondValue, deadline, secondSig.v, secondSig.r, secondSig.s)
      await truffleAssert.fails(wpokt.permit(owner, spender, firstValue, deadline, firstSig.v, firstSig.r, firstSig.s), 'wPOKT:INVALID_SIGNATURE')
    })
  })

  context('ERC-3009', () => {
    let from, fromPrivKey
    const to = newHolder

    async function createTransferWithAuthorizationSignature(from, to, value, validBefore, validAfter, nonce) {
      const digest = await createTransferWithAuthorizationDigest(wpokt, from, to, value, validBefore, validAfter, nonce)

      const { r, s, v } = ecsign(
        Buffer.from(digest.slice(2), 'hex'),
        Buffer.from(fromPrivKey.slice(2), 'hex')
      )

      return { r, s, v }
    }

    before(async () => {
      const wallet = web3.eth.accounts.create('erc3009')
      from = wallet.address
      fromPrivKey = wallet.privateKey
    })

    beforeEach(async () => {
      await wpokt.mint(from, tokenAmount(50), { from: minter })
    })

    it('has the correct transferWithAuthorization typehash', async () => {
      assert.equal(await wpokt.TRANSFER_WITH_AUTHORIZATION_TYPEHASH(), TRANSFER_WITH_AUTHORIZATION_TYPEHASH, 'erc3009: typehash')
    })

    it('can transfer through transferWithAuthorization', async () => {
      const validAfter = 0
      const validBefore = MAX_UINT256

      const firstNonce = keccak256('first')
      const secondNonce = keccak256('second')
      assert.equal(await wpokt.authorizationState(from, firstNonce), false, 'erc3009: first auth unused')
      assert.equal(await wpokt.authorizationState(from, secondNonce), false, 'erc3009: second auth unused')

      const firstValue = tokenAmount(25)
      const firstSig = await createTransferWithAuthorizationSignature(from, to, firstValue, validAfter, validBefore, firstNonce)
      await itTransfersCorrectly(
        () => wpokt.transferWithAuthorization(from, to, firstValue, validAfter, validBefore, firstNonce, firstSig.v, firstSig.r, firstSig.s),
        { from, to, value: firstValue }
      )
      assert.equal(await wpokt.authorizationState(from, firstNonce), true, 'erc3009: first auth')

      const secondValue = tokenAmount(10)
      const secondSig = await createTransferWithAuthorizationSignature(from, to, secondValue, validAfter, validBefore, secondNonce)
      await itTransfersCorrectly(
        () => wpokt.transferWithAuthorization(from, to, secondValue, validAfter, validBefore, secondNonce, secondSig.v, secondSig.r, secondSig.s),
        { from, to, value: secondValue }
      )
      assert.equal(await wpokt.authorizationState(from, secondNonce), true, 'erc3009: second auth')
    })

    it('cannot transfer above balance', async () => {
      const value = (await wpokt.balanceOf(from)).add(bn('1'))
      const nonce = keccak256('nonce')
      const validAfter = 0
      const validBefore = MAX_UINT256

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, to, value, validAfter, validBefore, nonce)
      await truffleAssert.fails(
        wpokt.transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s),
        'MATH:SUB_UNDERFLOW'
      )
    })

    it('cannot transfer to token', async () => {
      const value = tokenAmount(100)
      const nonce = keccak256('nonce')
      const validAfter = 0
      const validBefore = MAX_UINT256

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, wpokt.address, value, validAfter, validBefore, nonce)
      await truffleAssert.fails(
        wpokt.transferWithAuthorization(from, wpokt.address, value, validAfter, validBefore, nonce, v, r, s),
        'wPOKT:RECEIVER_IS_TOKEN_OR_ZERO'
      )
    })

    it('cannot transfer to zero address', async () => {
      const value = tokenAmount(100)
      const nonce = keccak256('nonce')
      const validAfter = 0
      const validBefore = MAX_UINT256

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, ZERO_ADDRESS, value, validAfter, validBefore, nonce)
      await truffleAssert.fails(
        wpokt.transferWithAuthorization(from, ZERO_ADDRESS, value, validAfter, validBefore, nonce, v, r, s),
        'wPOKT:RECEIVER_IS_TOKEN_OR_ZERO'
      )
    })

    it('cannot use wrong signature', async () => {
      const validAfter = 0
      const validBefore = MAX_UINT256

      const firstNonce = keccak256('first')
      const firstValue = tokenAmount(25)
      const firstSig = await createTransferWithAuthorizationSignature(from, to, firstValue, validAfter, validBefore, firstNonce)

      const secondNonce = keccak256('second')
      const secondValue = tokenAmount(10)
      const secondSig = await createTransferWithAuthorizationSignature(from, to, secondValue, validAfter, validBefore, secondNonce)

      // Use a mismatching signature
      await truffleAssert.fails(
        wpokt.transferWithAuthorization(from, to, firstValue, validAfter, validBefore, firstNonce, secondSig.v, secondSig.r, secondSig.s),
        'wPOKT:INVALID_SIGNATURE'
      )
    })

    it('cannot use before valid period', async () => {
      const value = tokenAmount(100)
      const nonce = keccak256('nonce')

      // Use a future period
      const now = bn((await web3.eth.getBlock('latest')).timestamp)
      const validAfter = now.add(bn(60))
      const validBefore = MAX_UINT256

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, to, value, validAfter, validBefore, nonce)
      await truffleAssert.fails(
        wpokt.transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s),
        'wPOKT:AUTH_NOT_YET_VALID'
      )
    })

    it('cannot use after valid period', async () => {
      const value = tokenAmount(100)
      const nonce = keccak256('nonce')

      // Use a prior period
      const now = bn((await web3.eth.getBlock('latest')).timestamp)
      const validBefore = now.sub(bn(60))
      const validAfter = 0

      const { r, s, v } = await createTransferWithAuthorizationSignature(from, to, value, validAfter, validBefore, nonce)
      await truffleAssert.fails(
        wpokt.transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s),
        'wPOKT:AUTH_EXPIRED'
      )
    })

    it('cannot use expired nonce', async () => {
      const nonce = keccak256('nonce')
      const validAfter = 0
      const validBefore = MAX_UINT256

      const firstValue = tokenAmount(25)
      const secondValue = tokenAmount(10)
      const firstSig = await createTransferWithAuthorizationSignature(from, to, firstValue, validAfter, validBefore, nonce)
      const secondSig = await createTransferWithAuthorizationSignature(from, to, secondValue, validAfter, validBefore, nonce)

      // Using one should disallow the other
      await wpokt.transferWithAuthorization(from, to, firstValue, validAfter, validBefore, nonce, firstSig.v, firstSig.r, firstSig.s)
      await truffleAssert.fails(
        wpokt.transferWithAuthorization(from, to, secondValue, validAfter, validBefore, nonce, secondSig.v, secondSig.r, secondSig.s),
        'wPOKT:AUTH_ALREADY_USED'
      )
    })
  })
})

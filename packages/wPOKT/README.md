# Wrapped POKT Token

[![Build Status](https://img.shields.io/github/workflow/status/pokt-network/wrapped-pokt-token/ci:v2?style=flat-square)](https://github.com/pokt-network/wrapped-pokt-token/actions?query=workflow%3Aci%3Av2)

A lightweight token supporting [ERC-2612](https://eips.ethereum.org/EIPS/eip-2612), [ERC-3009](https://eips.ethereum.org/EIPS/eip-3009), token mints, and token burns. Modelled after [UNI-LP](https://github.com/Uniswap/uniswap-v2-core/blob/v1.0.1/contracts/UniswapV2ERC20.sol) with minimal changes.

## Status

This package is in _passive development_ mode: it will only receive updates if there's any need of any deployment tools or doc updates.

wPOKT has not been deployed yet.

## Development

```sh
yarn install
yarn test
```

This will run the [unit tests](test/).

CI for this package is run through the [`ci_v2` Github action](../../.github/workflows/ci_v2.yml).

### Code style

To limit changes, [`wPOKT.sol`](contracts/wPOKT.sol) carries over the code style of the original `ANTv2` codebase.

## Credits

- UNI-LP: Uniswap
- SafeMath: DappHub

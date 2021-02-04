<p align="center"><img width="50%" src="https://user-images.githubusercontent.com/16605170/74199287-94f17680-4c18-11ea-9de2-b094fab91431.png"></p>

<div align="center">
  <h4>
    <a href="https://aragon.network">
      Website
    </a>
    <span> | </span>
    <a href="#">
      Documentation
    </a>
    <span> | </span>
    <a href="https://bit.ly/POKTsite_DSCRDinvite">
      Chat
    </a>
  </h4>
</div>

# Wrapped POKT Token

<p>
  <!-- Security -->
  <a href="SECURITY.md">
    <img src="https://img.shields.io/badge/security-audited-green?style=flat-square" alt="Security" />
  </a>
</p>

Smart contracts and additional resources for the Wrapped POKT Token, forked from Aragon's [ANTv2](https://aragon.org/token/ant).

- ✅ wPOKT has not been deployed yet. Beware of any scams! As soon as the token gets deployed to Mainnet we will have the updated address here.
- 🔍 Audits and security details are available in the [security policy](SECURITY.md)
- 📚 Additional documentation and user guides are available [in the repo](docs/) or as a [Gitbook]()
- Wanna learn more about Pocket Network? Check the [official website out](https://pokt.network/)

## Structure

This repo contains the package for the wPOKT contract:

- [`wPOKT`](packages/wPOKT): the latest wPOKT token contract. [Check it out](packages/v2/contracts/wPOKT.sol)

## Important contract info

### wPOKT

- [wPOKT.sol](packages/v2/contracts/wPOKT.sol): Main contract for the token. Lightweight and supports [ERC-2612](https://eips.ethereum.org/EIPS/eip-2612), [ERC-3009](https://eips.ethereum.org/EIPS/eip-3009), token mints, and token burns.


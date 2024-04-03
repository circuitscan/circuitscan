# Circuitscan

> In the same way as we have Etherscan for solidity "Publish Your Source Code"we need to have Etherscan, "Publish Your Circom Code", or even "Publish Your Stark", "Cairo Precode", or whatever the original source language is. And then it would compile and it would actually verify that the on-chain verification key matches. These are things that totally can be done. And I hope someone does them in the hackathon tomorrow.

*Vitalik Buterin March 26, 2024* [Source](https://www.defideveloper.news/vitalik-ethtaipei-interview/)

## TODO

- [ ] support more than just holesky
- [ ] support more than just latest circom version
- [ ] file operations must go in /tmp on AWS (i.e. Submissions only work with local docker atm)
- [ ] ddos protection!
- [ ] allow for contract name changes?
- [ ] form for submitting a proof to be verified

## Installation

> Requires Node.js, Yarn, and Docker (for local server)

```
$ git clone https://github.com/numtel/circuitscan
$ cd circuitscan
$ yarn

# In another terminal, start frontend dev server
$ yarn dev
```

### Local Server

```
# Build server lambda docker image
$ yarn build:server

# Configure Etherscan, AWS DynamoDB
$ cp .env.example .env
$ ed .env

# Run server lambda in docker container
$ yarn dev:server
```

Finally, update the `API_URL` to `/api` in [`src/pages/Address.js`](src/pages/Address.js)

## License

MIT

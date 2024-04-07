# Circuitscan

> In the same way as we have Etherscan for solidity "Publish Your Source Code"we need to have Etherscan, "Publish Your Circom Code", or even "Publish Your Stark", "Cairo Precode", or whatever the original source language is. And then it would compile and it would actually verify that the on-chain verification key matches. These are things that totally can be done. And I hope someone does them in the hackathon tomorrow.

*Vitalik Buterin March 26, 2024* [Source](https://www.defideveloper.news/vitalik-ethtaipei-interview/)

## TODO

- [ ] support more than just latest circom version
- [ ] ddos protection!
- [ ] separate lambdas deployed with low/high memory for getStatus/verify
- [ ] allow for contract name changes?
- [ ] form for submitting a proof to be verified
- [ ] form for compiling and deploying a circuit
- [ ] auto-include circomlib files in selector
- [ ] fork/create new circuit

## Installation

> [!NOTE]
> Requires Node.js, Yarn, and Docker (if you want to run server locally)

```
$ git clone https://github.com/numtel/circuitscan
$ cd circuitscan
$ yarn

# Default env var settings are fine for using remote deployed server
$ cp .env.example .env

# In another terminal, start frontend dev server
$ yarn dev
```

### Local Server

```
# Configure Etherscan, AWS DynamoDB
# And update the `VITE_API_URL` to `/api` in your `.env` file
$ vim .env

# Build server lambda docker image
$ yarn build:server

# Run server lambda in docker container
$ yarn dev:server
```

## License

MIT

# Circuitscan

> In the same way as we have Etherscan for solidity "Publish Your Source Code"we need to have Etherscan, "Publish Your Circom Code", or even "Publish Your Stark", "Cairo Precode", or whatever the original source language is. And then it would compile and it would actually verify that the on-chain verification key matches. These are things that totally can be done. And I hope someone does them in the hackathon tomorrow.

*Vitalik Buterin March 26, 2024* [Source](https://www.defideveloper.news/vitalik-ethtaipei-interview/)

## TODO

- [x] support more than just latest circom version
- [ ] add support for noir verifiers too
- [x] ddos protection! / account system (sign in with ethereum)
- [x] [api for programmatic verification](https://github.com/circuitscan/cli) / command in circomkit fo ci
- [x] testing on circuit verifiers in the wild

## Installation

To run the frontend locally:

> [!NOTE]
> Requires Node.js and Yarn

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

Optionally, you can also develop the server locally.

> [!NOTE]
> Requires Docker

```
# Configure S3 settings for local server
$ vim .env

# Build server lambda docker image
$ yarn build:server

# Run server lambda in docker container
$ yarn dev:server

```

## License

MIT

import {
  holesky,
  sepolia,
  mainnet,
  optimism,
  polygon,
  fantom,
  arbitrum,
  arbitrumNova,
  gnosis,
  celo,
  base,
} from 'viem/chains';

export function findChain(chainId) {
  for(let chain of chains) {
    if(Number(chainId) === chain.chain.id) return chain;
  }
}


export const chains = [
  {
    chain: holesky,
    apiUrl: 'https://api-holesky.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  {
    chain: sepolia,
    apiUrl: 'https://api-sepolia.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  {
    chain: mainnet,
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  {
    chain: optimism,
    apiUrl: 'https://api-optimistic.etherscan.io/api',
    apiKey: process.env.OPTIMISM_ETHERSCAN_API_KEY
  },
  {
    chain: polygon,
    apiUrl: 'https://api.polygonscan.com/api',
    apiKey: process.env.POLYGON_ETHERSCAN_API_KEY
  },
  {
    chain: fantom,
    apiUrl: 'https://api.ftmscan.com/api',
    apiKey: process.env.FANTOM_ETHERSCAN_API_KEY
  },
  {
    chain: arbitrum,
    apiUrl: 'https://api.arbiscan.io/api',
    apiKey: process.env.ARBITRUM_ETHERSCAN_API_KEY
  },
  {
    chain: arbitrumNova,
    apiUrl: 'https://api.arbiscan.io/api',
    apiKey: process.env.ARBITRUM_NOVA_ETHERSCAN_API_KEY
  },
  {
    chain: gnosis,
    apiUrl: 'https://api.gnosisscan.io/api',
    apiKey: process.env.GNOSIS_ETHERSCAN_API_KEY
  },
  {
    chain: celo,
    apiUrl: 'https://api.celoscan.io/api',
    apiKey: process.env.CELO_ETHERSCAN_API_KEY
  },
  {
    chain: base,
    apiUrl: 'https://api.basescan.org/api',
    apiKey: process.env.BASE_ETHERSCAN_API_KEY
  },
];

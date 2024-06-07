import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { CodeBracketSquareIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';

import Card from '../components/Card.js';
import Newest from '../components/Newest.js';
import {clsButton, clsIconA} from '../components/Layout.js';

export function Home() {
  return (<div id="home">
    <Helmet>
      <title>Circuitscan - Home</title>
    </Helmet>
    <Card>
      <p className="py-3">
        Like verifying a contract on the block explorer, verify your Circom circuits on the circuit explorer.
        <br /><br />
        Supports all chains with Etherscan (or equivalent):
        <br />
        Mainnet, Optimism, Polygon, Fantom, Arbitrum, Arbitrum Nova, Gnosis, Celo, Base, Sepolia, and Holesky.
        <br /><br />
        Use the CLI to verify or deploy your circuit verifiers.
      </p>
      <p className="p-6">
        <a href="https://github.com/circuitscan/cli" target="_blank" rel="noopener">
          <button className={clsButton}>
            <CodeBracketSquareIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            Circuitscan CLI on Github
          </button>
        </a>
      </p>
    </Card>
    <Newest />
  </div>);
}

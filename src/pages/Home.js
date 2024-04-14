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
        This beta version supports Sepolia and Holesky.
        <br />
        Maximum 5000 MB RAM on server for deploy/verify.
      </p>
      <p className="p-6">
        <Link to="/deploy">
          <button className={clsButton}>
            <PaperAirplaneIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            Deploy Circuit
          </button>
        </Link>
        <a href="https://github.com/numtel/circuitscan" target="_blank" rel="noopener">
          <button className={clsButton}>
            <CodeBracketSquareIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            View Github Repo
          </button>
        </a>
      </p>
    </Card>
    <Newest />
    <Card>
      <h3 className="text-xl p-6 pb-0">Why do Groth16 verifiers mismatch <code>delta&#123;x|y&#125;&#123;1|2&#125;</code> values?</h3>
      <p className="p-6">
        These values correspond to the entropy used during compilation. This process does not attempt to recreate these settings.
        <br/><br/>

        To avoid this problem and ensure that proofs can be generated on the circuit's page, deploy your circuit using the Circuitscan deployer.
      </p>
    </Card>
  </div>);
}

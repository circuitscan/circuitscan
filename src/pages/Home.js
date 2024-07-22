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
      <h3 className={`
        text-xl pt-6 pb-3
        border-b border-neutral-300 dark:border-neutral-600
      `}>Circuit Verifier Directory</h3>
      <p className="py-3">
        Curated list of popular zk dapp verifiers under construction...
      </p>
      <ul className="mb-6">
        <li>
          <Link
            className={`
              py-3 flex items-center justify-between
              ${clsIconA}
            `}
            to={`/chain/17000/address/0xd812358866b1b6a71eae3f38b5cfd72c1ba8ca38#source-code`}
          >
            <span className={`
              text-ellipsis inline-block overflow-hidden
              mr-1 grow
            `}>
              <span className="font-bold">
                Example compilation of zkP2P Venmo Send verifier at full size
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </Card>
    <Newest />
  </div>);
}

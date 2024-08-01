import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  CodeBracketSquareIcon,
  BookOpenIcon,
  MapIcon,
  SpeakerWaveIcon,
  UserGroupIcon,
} from '@heroicons/react/24/solid';

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
        Circuitscan provides the same safety guarantees to circuit verifier contracts as normal smart contracts receive by verifying their source code on a block explorer: guaranteed access to the application even if their frontend becomes unavailable as well as the ability to review the source code for potential issues.
        <br /><br />
        Supports all EVM chains. Use the CLI to verify or deploy your circuit verifiers.
      </p>
      <p className="pt-6">
        <a href="https://circuitscan.readthedocs.io" target="_blank" rel="noopener">
          <button className={clsButton}>
            <BookOpenIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            Docs
          </button>
        </a>
        <a href="https://medium.com/@circuitscan" target="_blank" rel="noopener">
          <button className={clsButton}>
            <SpeakerWaveIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            Blog
          </button>
        </a>
        <a href="https://github.com/circuitscan/cli" target="_blank" rel="noopener">
          <button className={clsButton}>
            <CodeBracketSquareIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            CLI
          </button>
        </a>
        <a href="https://t.me/circuitscan" target="_blank" rel="noopener">
          <button className={clsButton}>
            <UserGroupIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            Telegram
          </button>
        </a>
        <a href="https://docs.google.com/spreadsheets/d/1r22REpvo1jRHmiWcIwlbdT8QI7kh8DBKz21RHFhDz0E/edit?usp=sharing" target="_blank" rel="noopener">
          <button className={clsButton}>
            <MapIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            Roadmap
          </button>
        </a>
      </p>
    </Card>
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

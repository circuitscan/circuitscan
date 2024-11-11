import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
  ArrowUpOnSquareStackIcon,
  CodeBracketSquareIcon,
  BookOpenIcon,
  MapIcon,
  SpeakerWaveIcon,
  UserGroupIcon,
  KeyIcon,
} from '@heroicons/react/24/solid';

import Card from '../components/Card.js';
import Directory from '../components/Directory.js';
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
        Supports all EVM chains. <Link to="/verify" className={`${clsIconA} underline underline-offset-2`}>Verify/Deploy in the browser</Link> or use the CLI to verify or deploy your circuit verifiers.
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
        <Link to="/verify">
          <button className={clsButton}>
            <ArrowUpOnSquareStackIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            Verify
          </button>
        </Link>
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
        <Link to="/manage-api-key">
          <button className={clsButton}>
            <KeyIcon className="h-9 w-9 text-lightaccent dark:text-darkaccent" />
            API Key
          </button>
        </Link>
      </p>
    </Card>
    <Card>
      <h3 className={`
        text-xl pt-6 pb-3
        border-b border-neutral-300 dark:border-neutral-600
      `}>Circuit Verifier Directory</h3>
      <Directory />
    </Card>
    <Newest />
  </div>);
}

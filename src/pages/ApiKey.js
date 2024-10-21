import { Helmet } from 'react-helmet';

import Card from '../components/Card.js';
import GenerateKey from '../components/GenerateKey.js';
import {clsIconA} from '../components/Layout.js';

export default function ApiKey() {
  return (<div id="api-key">
    <Helmet>
      <title>Circuitscan - API Key</title>
    </Helmet>
    <Card>
      <div className="flex flex-col space-y-4">
        <p>Generate an API key to gain access to verifications.</p>
        <p>Your API keys will be tied to your wallet address but no transactions are required, only signatures to prove your ownership of the account.</p>
        <p>Most recent API Key is saved in browser local storage for browser-initiated verifications and deployments.</p>
        <p>
          Use the&nbsp;
          <a
            href="https://circuitscan.readthedocs.io/en/latest/usage.html#login"
            target="_blank"
            rel="noopener"
            className={`${clsIconA} underline`}
          >
            login command
          </a>
          &nbsp;to save your API key if using the CLI.
        </p>
      </div>
    </Card>
    <Card>
      <GenerateKey
        className="flex justify-between"
        showList={true}
      />
    </Card>
  </div>);
}


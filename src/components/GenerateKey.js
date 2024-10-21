import {useState, useEffect} from 'react';

import { toast } from 'react-hot-toast';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  useAccount,
  useWalletClient,
} from 'wagmi';
import {
  ConnectButton,
} from '@rainbow-me/rainbowkit';

import WalletWrapper from './WalletWrapper.js';
import CopyLink from './CopyLink.js';
import {clsButton, clsIconA} from './Layout.js';
import useLocalStorageState from './useLocalStorageState.js';

export default function({showList, className}) {
  return (
    <WalletWrapper>
      <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_KEY}>
        <GenerateKey {...{showList, className}}/>
      </GoogleReCaptchaProvider>
    </WalletWrapper>
  );
}

function GenerateKey({showList, className}) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [list, setList] = useState(null);
  const [apiKey, setApiKey] = useLocalStorageState('cs-apikey', '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!executeRecaptcha) {
      console.log("Recaptcha has not been loaded");
      return;
    }

    setLoading(true);
    try {
      const nonce = generateNonce();
      const signature = await walletClient.signMessage({
        message: 'Generate New API Key\n\n' + nonce,
      });
      const token = await executeRecaptcha('generateKey');
      const response = await fetch(import.meta.env.VITE_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: {
            action: 'generateApiKey',
          },
          address,
          nonce,
          signature,
          captchaToken: token,
        }),
      });

      let data = await response.json();
      // Local dev container returns differently
      if(data.body) data = JSON.parse(data.body);

      // Save API key in localStorage for verifications in browser
      const newKey = data.output.filter(x => x.secret.slice(0,1) !== 'x');
      if(newKey.length > 0) setApiKey(newKey[0].secret);

      setList({
        keys: data.output,
        address
      });
    } catch(error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form
        {...{className}}
        onSubmit={handleSubmit}
      >
        <ConnectButton chainStatus="none" showBalance={false} />
        <button
          className={clsButton}
          type="submit"
          disabled={!address || loading}
        >
          <PlusCircleIcon className="inline-block h-5 w-5 align-text-bottom mr-2" />
          {loading ? 'Generating New Key...' : 'Generate New Key'}
        </button>
      </form>
      {showList && <ListKeys {...{list, setList}} address={address} />}
    </>
  );
}

function ListKeys({ list, setList, address }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { data: walletClient } = useWalletClient();
  const [loadList, setLoadList] = useState(false);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const nonce = generateNonce();
        const signature = await walletClient.signMessage({
          message: 'List API Keys\n\n' + nonce,
        });
        const result = await fetch(import.meta.env.VITE_SERVER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payload: {
              action: 'listApiKey',
            },
            address,
            nonce,
            signature,
          }),
        });
        let data = await result.json();
        // Local dev container returns differently
        if(data.body) data = JSON.parse(data.body);
        setList({
          keys: data.output,
          address
        });
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    (!list || list.address !== address) && loadList && address && walletClient && loadAsyncData();
  }, [address, walletClient, loadList]);

  async function removeKey(secret) {
    toast.loading('Removing key...');
    try {
      const nonce = generateNonce();
      const signature = await walletClient.signMessage({
        message: 'Remove API Key: ' + secret + '\n\n' + nonce,
      });
      const result = await fetch(import.meta.env.VITE_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: {
            action: 'removeApiKey',
          },
          keyToRemove: secret,
          address,
          nonce,
          signature,
        }),
      });
      let data = await result.json();
      // Local dev container returns differently
      if(data.body) data = JSON.parse(data.body);
      setList({
        keys: data.output,
        address
      });
      toast.dismiss();
      toast.success('Key Removed');
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Error removing key.');
    }
  }

  if(!address || (list && list.address !== address)) return null;
  if(!loadList && (!list || list.address !== address)) return (
    <div className="py-2 px-4 flex flex-col">
      <p className="text-center">
        Sign a message to load your list of generated API Keys
      </p>
      <button
        onClick={() => setLoadList(true)}
        className={`${clsButton} m-6 self-center`}
      >
        Load my API Keys...
      </button>
    </div>
  );
  return (<>
    {loading ? <p>Loading...</p> :
      error ? <p>Error!</p> :
        <ul>
          {list.keys.length === 0 ?
            <li className="py-2 px-4">
              <p className="text-center italic">
                No API Keys generated yet.
              </p>
            </li> :
            list.keys.map((record, index) =>
              <li
                className="border-b border-neutral-300 dark:border-neutral-600 p-4"
                key={index}
              >
                <dl className="pb-2">
                  <dt className="text-l font-bold">Created At</dt>
                  <dd className="pl-6">
                    {(new Date(record.created)).toLocaleString()}
                  </dd>
                  <dt className="text-l font-bold">Secret Key</dt>
                  <dd className="pl-6">
                    {record.secret.startsWith('x')
                    ? record.secret
                    : <CopyLink text={record.secret} />}
                  </dd>
                </dl>
                <button
                  className={clsButton}
                  onClick={() => removeKey(record.secret)}
                >
                  <TrashIcon className="inline-block h-5 w-5 align-text-bottom mr-2" />
                  Deactivate
                </button>
            </li>)}
        </ul>
      }
  </>);
}

function generateNonce() {
  const nonceArray = new Uint8Array(10);
  crypto.getRandomValues(nonceArray);
  return Array.from(nonceArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

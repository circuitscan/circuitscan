import {useState, useEffect} from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import {
  useAccount,
  useWalletClient,
  usePublicClient,
  useWaitForTransactionReceipt,
} from 'wagmi';
import {
  ConnectButton,
} from '@rainbow-me/rainbowkit';

import Card from '../components/Card.js';
import WalletWrapper from '../components/WalletWrapper.js';
import {clsButton} from '../components/Layout.js';

export default function DeployVerifier() {
  return (<div id="api-key">
    <Helmet>
      <title>Circuitscan - Deploy Verifier</title>
    </Helmet>
    <Card>
      <WalletWrapper>
        <div className="my-8 flex flex-col items-center">
          <Deployer />
        </div>
      </WalletWrapper>
    </Card>
  </div>);
}

function Deployer() {
  const {reference} = useParams();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: publicClient } = usePublicClient();
  const [tx, setTx] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [finalLoading, setFinalLoading] = useState(true);
  const [finalError, setFinalError] = useState(null);
  const { data: txData, isLoading: txLoading, isError: txError } = useWaitForTransactionReceipt({ hash: tx });

  // TODO show a message if a deployed address has already be submitted for this reference?
  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const result = await fetch(`${import.meta.env.VITE_BLOB_URL}solc/${reference}.json`);
        const data = await result.json();
        setData(data);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, [reference]);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const result = await fetch(import.meta.env.VITE_SERVER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payload: {
              action: 'storeDeployedAddress',
            },
            address: txData.contractAddress,
            chainId: txData.chainId,
            reference,
          }),
        });
        const data = await result.json();
        setFinalData(data);
      } catch (err) {
        console.error(err);
        setFinalError(err);
      } finally {
        setFinalLoading(false);
      }
    };

    txData && loadAsyncData();
  }, [txData]);

  async function submitTx() {
    const hash = await walletClient.deployContract({
      abi: data.body.payload.solcOutput.abi,
      bytecode: data.body.payload.solcOutput.bytecode,
    });
    setTx(hash);
  }

  if(error) return (<>
    <p>Error loading compiled bytecode!</p>
  </>);

  if(loading) return (<>
    <p>Loading compiled bytecode...</p>
  </>);

  if(address && !tx) return (<>
    <ConnectButton />
    <p className="my-4">Click the button to deploy your circuit verifier contract.</p>
    <button
      onClick={submitTx}
      className={clsButton}
      disabled={!walletClient}
    >
      Deploy Verifier Contract...
    </button>
  </>);

  if(address && tx) {
    if(txLoading) return (<>
      <p>Waiting for transaction confirmation...</p>
    </>);

    if(txError) return (<>
      <p>Transaction confirmation error!</p>
    </>);

    if(finalLoading) return (<>
      <p>Submitting deployed address...</p>
    </>);

    if(finalError) return (<>
      <p>Error submitting deployed address!</p>
    </>);

    return (<>
      <p>Your contract has been deployed.</p>
      <p>You may now close this page and return to your CLI session.</p>
    </>);
  }

  return (<>
    <p className="my-4">Connect your wallet to deploy your recently compiled circuit verifier</p>
    <ConnectButton />
  </>);
}


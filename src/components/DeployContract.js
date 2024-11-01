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
import {
  compileContract,
  verifyOnSourcifyWithRetry,
} from '../utils/solidity.js';

export default function DeployContract({ pkgName, deployment, setDeployment }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: publicClient } = usePublicClient();
  const [soliditySource, setSoliditySource] = useState(null);
  const [tx, setTx] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [finalLoading, setFinalLoading] = useState(true);
  const [finalError, setFinalError] = useState(null);
  const { data: txData, isLoading: txLoading, isError: txError } = useWaitForTransactionReceipt({ hash: tx });

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `${import.meta.env.VITE_BLOB_URL}build/${pkgName}/verifier.sol`;
        const soliditySource = await (await fetch(url)).text();
        setSoliditySource(soliditySource);
        setData(await compileContract(soliditySource));
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    setData(null);
    pkgName && loadAsyncData();
  }, [pkgName]);

  useEffect(() => {
    const loadAsyncData = async () => {
      await verifyOnSourcifyWithRetry(
        txData.chainId,
        txData.contractAddress,
        soliditySource,
        data
      );
      setDeployment(txData);
    };
    txData && setDeployment && loadAsyncData();
  }, [ txData, setDeployment ]);

  async function submitTx() {
    const hash = await walletClient.deployContract({
      abi: data.abi,
      bytecode: data.bytecode,
    });
    setTx(hash);
  }

  if(error) return (<>
    <p>Error loading verifier contract!</p>
  </>);

  if(loading) return (<>
    <p>Loading verifier contract...</p>
  </>);

  if(address && !tx) return (<>
    <ConnectButton />
    <button
      onClick={submitTx}
      className={`${clsButton} mt-4`}
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

    if(!deployment) return (<>
      <p>Awaiting contract verification on Sourcify...</p>
    </>);

    return (<>
      <p>Your contract has been deployed.</p>
    </>);
  }

  return (<>
    <p className="my-4">Connect your wallet to deploy the circuit verifier.</p>
    <ConnectButton />
  </>);
}



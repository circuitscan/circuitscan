import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { toast } from 'react-hot-toast';
import { useNavigate } from "react-router-dom";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useWalletClient,
  useWaitForTransactionReceipt,
} from 'wagmi';

import useFetchJson from '../components/useFetchJson.js';
import useFetchPost from '../components/useFetchPost.js';
import useDarkMode from '../components/useDarkMode.js';
import CodeBlock from '../components/CodeBlock.js';
import CircuitForm from '../components/CircuitForm.js';
import Card from '../components/Card.js';

export function Deploy() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const navigate = useNavigate();
  const [ txHash, setTxHash ] = useState();
  const { isError, isPending, isSuccess, data } = useWaitForTransactionReceipt({ hash: txHash });
  const {
    post,
    data: postData,
    loading: postLoading,
    error: postError,
  } = useFetchPost();
  useEffect(() => {
    if(postError) {
      toast.dismiss();
      toast.error('Verification error!');
    }
  }, [ postError ]);

  async function handleSubmit(event) {
    toast.loading('Compiling circuit...');
    const result = await post(import.meta.env.VITE_API_URL, { payload: {
      ...event,
      action: 'build',
    }});
    if('errorType' in result) {
      toast.dismiss();
      toast.error(result.errorMessage);
      return;
    }
    const body = JSON.parse(result.body);

    toast.dismiss();
    toast.loading('Deploying circuit...');

    let hash;
    try {
      hash = await walletClient.deployContract({
        abi: body.compiled.abi,
        bytecode: '0x' + body.compiled.bin,
      });
    } catch (error) {
      toast.dismiss();
      toast.error('Deployment failed.');
    }

    toast.dismiss();
    setTxHash(hash);
  }

  useEffect(() => {
    async function postTxSequence() {
      console.log(data);
      // TODO Verify contract on etherscan
      // TODO Verify circuit
      navigate(`/address/${data.contractAddress}`);
    }
    if(data) {
      postTxSequence();
    }
  }, [data]);

  return (<div className="p-6">
    <Helmet>
      <title>Circuitscan - Deploy Circuit</title>
    </Helmet>
    <Card>
      <div className="py-6">
        <ConnectButton />
      </div>
      <h3 className="text-xl font-bold mb-8">To deploy circuit, select Circom source file...</h3>
      <CircuitForm disableSubmit={!address} submitHandler={handleSubmit} />
      {isError && <p>Transaction error!</p>}
      {isPending && <p>Transaction pending!</p>}
      {isSuccess && <p>Transaction success!</p>}
    </Card>
  </div>);
}


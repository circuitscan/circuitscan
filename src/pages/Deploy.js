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
import {clsButton} from '../components/Layout.js';

export function Deploy() {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const navigate = useNavigate();
  const [ txHash, setTxHash ] = useState();
  const [ compiled, setCompiled ] = useState();
  const [ formEvent, setFormEvent ] = useState();
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
    setFormEvent(event);
    toast.loading('Compiling circuit...');
    const result = await post(import.meta.env.VITE_API_URL_BIG, { payload: {
      ...event,
      action: 'build',
    }});
    if('errorType' in result) {
      toast.dismiss();
      toast.error(result.errorMessage);
      return;
    }
    const body = 'body' in result ? JSON.parse(result.body) : result;
    setCompiled(body);

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

  async function verifyContract(retries) {
      toast.dismiss();
      toast.loading('Verifying contract...');
      let json1;
      try {
        const resp1 = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payload: {
            action: 'verify-contract',
            address: data.contractAddress,
            chainId: String(chainId),
            sourceCode: compiled.solidityCode,
          }}),
        });
        json1 = await resp1.json();
      } catch(error) {
        // AWS Deployed version throws on error
        toast.dismiss();
        if((retries || 0) < 5) {
          toast.loading('Error verifying contract, retrying...');
        } else {
          toast.error(error.message);
        }
        console.error(error);
        setTimeout(() => {
          // Retry 5 times, 10 seconds each...
          if((retries || 0) < 5) verifyContract((retries || 0) + 1);
        }, 10000);
        return;
      }
      // Local dev version returns like this:
      if('errorType' in json1) {
        toast.dismiss();
        toast.error(json1.errorMessage);
        console.error(json1);
        if(json1.errorMessage.indexOf('waiting for a minute') > -1) {
          setTimeout(verifyContract, 5000);
        }
      }
      const {guid} = 'body' in json1 ? JSON.parse(json1.body) : json1;
      let intervalCount = 0;
      const finishedInterval = setInterval(async () => {
        const resp2 = await fetch(import.meta.env.VITE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ payload: {
            action: 'check-verify-contract',
            guid,
            chainId: String(chainId),
          }}),
        });
        const json2 = await resp2.json();
        const alreadyVerified = 'errorType' in json2 && json2.errorMessage.indexOf('Already Verified') !== -1;
        if('errorType' in json2 && !alreadyVerified) {
          clearInterval(finishedInterval);
          toast.dismiss();
          toast.error(json2.errorMessage);
          console.error(json2);
        }
        let body2;
        if(!alreadyVerified) {
          body2 = 'body' in json2 ? JSON.parse(json2.body) : json2;
        }
        if(alreadyVerified || body2.success) {
          clearInterval(finishedInterval);
          toast.dismiss();
          toast.loading('Verifying circuit...');

          const result = await post(import.meta.env.VITE_API_URL_BIG, { payload: {
            ...formEvent,
            action: 'verify',
            address: data.contractAddress,
            chainId: String(chainId),
          }});
          if('errorType' in result) {
            toast.dismiss();
            toast.error(result.errorMessage);
            return;
          }

          toast.dismiss();
          navigate(`/chain/${chainId}/address/${data.contractAddress}`);
          return;
        }
        if(++intervalCount > 5) {
          clearInterval(finishedInterval);
          toast.dismiss();
          toast.error('Contract Verification Timeout!');
          return;
        }
      }, 5000);
  }

  useEffect(() => {
    if(data) {
      toast.dismiss();
      toast.loading('Waiting for confirmations...');
      setTimeout(verifyContract, 5000);
    }
  }, [data]);

  return (<div className="p-6">
    <Helmet>
      <title>Circuitscan - Deploy Circuit</title>
    </Helmet>
    {isError ?
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p>Transaction Error!</p>
        </div>
      </Card>
    : txHash && isPending ?
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p>Transaction pending...</p>
        </div>
      </Card>
    : isSuccess ?
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p>Verifying Contract and Circuit...</p>
        </div>
      </Card>
    : <Card>
        <div className="pb-6">
          <ConnectButton />
        </div>
        <h3 className="text-xl font-bold mb-8">To deploy circuit, select Circom source file...</h3>
        <CircuitForm disableSubmit={!address} submitHandler={handleSubmit} />
      </Card>
    }
  </div>);
}


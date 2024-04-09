import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'react-hot-toast';
import ReactDiffViewer from 'react-diff-viewer';
import { isAddress } from 'viem';
import * as chains from 'viem/chains';
import {
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import useFetchJson from '../components/useFetchJson.js';
import useFetchPost from '../components/useFetchPost.js';
import useDarkMode from '../components/useDarkMode.js';
import CodeBlock from '../components/CodeBlock.js';
import CircuitForm from '../components/CircuitForm.js';
import Card from '../components/Card.js';
import {clsIconA, clsButton} from '../components/Layout.js';

// TODO form for submitting a proof to be verified
export function Address() {
  const navigate = useNavigate();
  const darkMode = useDarkMode();
  const {address, chain: chainParam} = useParams();
  const isValid = isAddress(address);
  const {data, loading, error, setData} = useFetchJson(
    isValid ? import.meta.env.VITE_API_URL : null,
    {
      payload: {
        action: 'get-status',
        address,
        chainId: chainParam,
      },
    },
  );

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

  let parsedData, deployedChain;
  if(data) {
    if('body' in data && typeof data.body === 'string') {
      parsedData = JSON.parse(data.body);
    } else {
      // Different format for function URL on AWS
      parsedData = data;
    }
    if(!chainParam
        && parsedData.source.chains
        && Object.keys(parsedData.source.chains).length > 0
    ) {
      const firstChain = Object.keys(parsedData.source.chains)[0];
      navigate(`/chain/${firstChain}/address/${address}`);
    }
    if(chainParam) {
      deployedChain = findChain(chainParam);
    }
  }

  async function handleSubmit(event) {
    toast.loading('Processing verification...');
    const result = await post(import.meta.env.VITE_API_URL, { payload: {
      ...event,
      action: 'verify',
      address,
      chainId: chainParam,
    }});
    setData({
      ...data,
      verified: JSON.parse(result.body),
    });
    toast.dismiss();
    window.scrollTo(0,0);
  }

  return (<div id="address" className="p-6">
    <Helmet>
      <title>Circuitscan - {!isValid ? 'Invalid Address' : address}</title>
    </Helmet>
    {isValid ? (<>
      <h2 className="text-l text-ellipsis overflow-hidden mb-3 font-bold">
        {address}&nbsp;
        <a
          href={`web3://${address}`}
          onClick={() => setClipboard(address)}
          title="Copy Address to Clipboard"
          className={clsIconA}
        >
          <DocumentDuplicateIcon className="inline h-5 w-5" />
        </a>&nbsp;

        {deployedChain && <a
          href={`${deployedChain.blockExplorers.default.url}/address/${address}`}
          target="_blank"
          rel="noopener"
          title="View on Block Explorer"
          className={clsIconA}
        >
          <ArrowTopRightOnSquareIcon className="inline h-5 w-5" />
        </a>}
      </h2>
      {parsedData && parsedData.source && <>
        {Object.keys(parsedData.source.chains).map((chainId) => {
          const chain = findChain(chainId);
          return <button
            key={chainId}
            disabled={chainParam === chainId}
            className={`
              ${clsButton}
              ${chainParam === chainId ? `
                disabled:bg-lightaccent disabled:dark:bg-darkaccent
                disabled:text-white disabled:dark:text-slate-800

              ` : ''}
            `}
            onClick={() => navigate(`/chain/${chainId}/address/${address}`)}
          >
            <>{chain.name}</>
          </button>;
        })}
      </>}
      {loading ? <>
        <p>Loading contract data...</p>
      </> : error ? <>
        <p>Error loading contract data!</p>
      </> : data && deployedChain && !parsedData.verified && parsedData.source ? <>
        <div className="">
          This contract has been verified on {deployedChain.blockExplorers.default.name} but the circuit has not yet been verified here.
        </div>
        <Card>
          <CodeBlock
            code={parsedData.source.chains[chainParam]}
            language="solidity"
          />
        </Card>
      </> : data && 'errorType' in parsedData ? <>
        <Card>
          <p className="text-rose-600 dark:text-rose-300">{parsedData.errorType}</p>
          <p>{parsedData.errorMessage}</p>
        </Card>
      </> : data && parsedData.verified ? <>
        <div className="">
          <div className="flex">
            {parsedData.verified.acceptableDiff ? <>
              <CheckIcon className="h-6 w-6 text-blue-500" />
              <p>The circuit has been verified for this contract</p>
            </> : <>
              <XMarkIcon className="h-6 w-6 text-red-500" />
              <p>The verification has failed</p>
            </>}
          </div>

          {parsedData.verified.diff.length > 1 && <>
            <Card>
              <h3 className="text-xl font-bold">Solidity Contract Diff ({parsedData.verified.acceptableDiff ? 'Acceptable' : 'Not Accepted'})</h3>
              <div
                className="mt-6 line-numbers overflow-auto w-full bg-slate-100 dark:bg-slate-900 dark:text-white"
              >
                <ReactDiffViewer
                  newValue={parsedData.verified.ogSource}
                  oldValue={parsedData.verified.contract}
                  splitView={false}
                  useDarkTheme={darkMode}
                />
              </div>
            </Card>
          </>}

          <Card>
            <dl>
              <dt className="text-l font-bold">Protocol</dt>
              <dd className="pl-6">{parsedData.verified.payload.protocol}</dd>
              <dt className="text-l font-bold">Template</dt>
              <dd className="pl-6">{parsedData.verified.payload.tpl}</dd>
              <dt className="text-l font-bold">Params</dt>
              <dd className="pl-6">{parsedData.verified.payload.params || <span className="italic">None</span>}</dd>
              <dt className="text-l font-bold">Pubs</dt>
              <dd className="pl-6">{parsedData.verified.payload.pubs || <span className="italic">None</span>}</dd>
            </dl>
          </Card>

          <Card>
            <h3 className="text-xl font-bold">{parsedData.verified.payload.file}</h3>
            <CodeBlock
              code={parsedData.verified.payload.files[parsedData.verified.payload.file].code}
              language="circom"
            />
          </Card>

          {Object.keys(parsedData.verified.payload.files)
            .filter(x => x !== parsedData.verified.payload.file).map((file, index) => <>
              <Card key={index}>
                <h3 className="text-xl font-bold">{file}</h3>
                <CodeBlock
                  code={parsedData.verified.payload.files[file].code}
                  language="circom"
                />
              </Card>
          </>)}
        </div>
      </> : <>
        <p>Unkown error occurred!</p>
      </>}

      {parsedData
       && parsedData.source
       && 'chains' in parsedData.source
       && Object.keys(parsedData.source.chains).length > 0
       && (!parsedData.verified || !parsedData.verified.acceptableDiff)
       &&
        <Card>
          <h3 className="text-xl font-bold mb-8">To verify circuit, select Circom source file...</h3>
          <CircuitForm submitHandler={handleSubmit} />
        </Card>}
    </>) : (<>
      <p>Invalid Address!</p>
    </>)}
  </div>);
}

function findChain(chainId) {
  for(let chain of Object.keys(chains)) {
    if(Number(chainId) === chains[chain].id) return chains[chain];
  }
}


async function setClipboard(text) {
  if (!navigator.clipboard) {
    toast.error('Clipboard API is not available in this browser.');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  } catch (err) {
    toast.error('Failed to copy to clipboard');
  }
}


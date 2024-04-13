import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from 'react-hot-toast';
import ReactDiffViewer from 'react-diff-viewer';
import {
  isAddress,
  keccak256,
  toHex,
  createPublicClient,
  http,
  encodeFunctionData,
} from 'viem';
import {
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import useFetchJson from '../components/useFetchJson.js';
import useFetchPost from '../components/useFetchPost.js';
import useDarkMode from '../components/useDarkMode.js';
import CodeBlock from '../components/CodeBlock.js';
import CircuitForm from '../components/CircuitForm.js';
import Card from '../components/Card.js';
import {clsIconA, clsButton} from '../components/Layout.js';
import {findChain, setClipboard, verifierABI} from '../utils.js';

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

  // TODO how to stop flikering using loadMore flag
  let parsedData, deployedChain, loadMore = true;
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
      loadMore = false;
    }
  }

  async function prove() {
    const protocol = parsedData.verified.payload.protocol;
    console.log(parsedData.verified.circuitHash);
    const resultProve = await post(import.meta.env.VITE_API_URL_CIRCOM, { payload: {
      action: 'prove',
      circuitHash: parsedData.verified.circuitHash,
      protocol,
      input: {
        in: [2,3],
      }
    }});
    // Difference between local Docker/AWS deployed
    const result = 'body' in resultProve ? JSON.parse(resultProve.body) : resultProve;
    console.log(result);
    const calldata = JSON.parse(result.calldata);
    console.log(calldata, deployedChain);

    const publicClient = createPublicClient({
      chain: deployedChain,
      transport: http(),
    });

    const funcData = encodeFunctionData({
      abi: verifierABI(protocol, result.proof.publicSignals.length),
      functionName: 'verifyProof',
      args: calldata,
    });

    const callResult = await publicClient.call({
      data: funcData,
      to: address,
    });
    const success = parseInt(callResult.data) > 0;
    console.log(success);

  }

  async function handleSubmit(event) {
    toast.loading('Processing verification...');
    const resultBuild = await post(import.meta.env.VITE_API_URL_CIRCOM, { payload: {
      ...event,
      action: 'build',
    }});
    // Difference between local Docker/AWS deployed
    const built = 'body' in resultBuild ? JSON.parse(resultBuild.body) : resultBuild;

    const resultVerify = await post(import.meta.env.VITE_API_URL, { payload: {
      ...event,
      action: 'verify',
      address,
      chainId: chainParam,
      signature: built.signature,
      contract: built.solidityCode,
    }});
    const verified = 'body' in resultVerify ? JSON.parse(resultVerify.body) : resultVerify;

    setData({
      ...data,
      verified,
    });
    toast.dismiss();
    window.scrollTo(0,0);
  }

  return (<div id="address">
    <Helmet>
      <title>Circuitscan - {!isValid ? 'Invalid Address' : address}</title>
    </Helmet>
    {isValid ? (<>
      <div className="px-4 pt-6 pb-0 max-w-7xl mx-auto xl:px-0">
        <h2 className="text-l text-ellipsis overflow-hidden mb-3">
          {parsedData && !loadMore && <div className="inline-block mr-1 align-middle">
            <div className={`
              flex pl-2 pr-3 py-1
              border rounded-full bg-neutral-200 dark:bg-neutral-900
              border-neutral-400 dark:border-neutral-600
              text-sm
            `}>
              {parsedData && parsedData.verified && parsedData.verified.acceptableDiff ? <>
                <CheckIcon className="h-5 w-5 text-blue-500" />
                <p>Circuit Verified</p>
              </> : <>
                <XMarkIcon className="h-5 w-5 text-red-500" />
                <p>Circuit not verified</p>
              </>}
            </div>
          </div>}

          <span className="mr-1 align-middle">{address}</span>

          <a
            href={`web3://${address}`}
            onClick={() => setClipboard(address)}
            title="Copy Address to Clipboard"
            className={`${clsIconA} print:hidden`}
          >
            <DocumentDuplicateIcon className="inline h-5 w-5" />
          </a>&nbsp;

          {deployedChain && <a
            href={`${deployedChain.blockExplorers.default.url}/address/${address}`}
            target="_blank"
            rel="noopener"
            title="View on Block Explorer"
            className={`${clsIconA} print:hidden`}
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
                inline-block px-2 py-1 mr-2
                border rounded-full bg-neutral-200 dark:bg-neutral-900
                border-neutral-400 dark:border-neutral-600
                text-sm
                disabled:bg-lightaccent disabled:dark:bg-darkaccent
                disabled:text-white disabled:dark:text-slate-800
                disabled:border-0
              `}
              onClick={() => navigate(`/chain/${chainId}/address/${address}`)}
            >
              <>{chain.name}</>
            </button>;
          })}
        </>}
      </div>
      {loading || loadMore ? <>
        <Card>
          <div className="flex flex-col w-full content-center items-center">
            <p className="p-6">Loading contract data...</p>
          </div>
        </Card>
      </> : error ? <>
        <Card>
          <div className="flex flex-col w-full content-center items-center">
            <p className="p-6">Error loading contract data!</p>
          </div>
        </Card>
      </> : data && deployedChain && !parsedData.verified && parsedData.source ? <>
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
            <button
              className={clsButton}
              onClick={prove}
            >Generate Proof...</button>
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

          {parsedData.verified.ogSource !== parsedData.verified.contract && <>
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
        </div>
      </> : <>
        <p>Unkown error occurred!</p>
      </>}

      {!loadMore && parsedData
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


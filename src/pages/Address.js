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
import DependencyCard from '../components/DependencyCard.js'
import {clsIconA, clsButton, clsInput} from '../components/Layout.js';
import {
  findChain,
  setClipboard,
  verifierABI,
  extractCircomTemplate,
  inputTemplate,
  fetchBlob,
} from '../utils.js';

export function Address() {
  const [proofInputs, setProofInputs] = useState('{}');
  const [proofOutput, setProofOutput] = useState();
  const [circomSource, setCircomSource] = useState();
  const navigate = useNavigate();
  const darkMode = useDarkMode();
  const {address, chain: chainParam} = useParams();
  const isValid = isAddress(address);
  const {data, loading, error, setData} = useFetchJson(
    isValid ? import.meta.env.VITE_API_URL : null,
    {
      payload: {
        // TODO this needs to not be a post for caching
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
  useEffect(() => {
    async function generateDefaultProofInput() {
      if(!data || !parsedData) return;
      const source = await fetchBlob(parsedData.verified.payload.files[parsedData.verified.payload.file]);
      setCircomSource(source);
      if(parsedData && parsedData.verified && chainParam) {
        const templateDetails = extractCircomTemplate(
          source,
          parsedData.verified.payload.tpl,
        );
        setProofInputs(JSON.stringify(inputTemplate(
          templateDetails,
          parsedData.verified.payload.params,
        ), null, 2));
      }
    }
    generateDefaultProofInput();
  }, [ data ]);

  async function prove() {
    let inputs;
    try {
      inputs = JSON.parse(proofInputs);
    } catch(error) {
      toast.error(error.message);
      return;
    }
    toast.dismiss();
    toast.loading('Generating proof...');
    const protocol = parsedData.verified.payload.protocol;
    const resultProve = await post(import.meta.env.VITE_API_URL_CIRCOM, { payload: {
      action: 'prove',
      circuitHash: parsedData.verified.circuitHash,
      protocol,
      input: inputs,
    }});
    // Difference between local Docker/AWS deployed
    const result = 'body' in resultProve ? JSON.parse(resultProve.body) : resultProve;
    if('errorType' in result) {
      toast.dismiss();
      toast.error(result.errorMessage);
      return;
    }
    const calldata = JSON.parse(result.calldata);

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
    if(!success) {
      toast.dismiss();
      toast.error('Proof inputs failed to generate!');
      return;
    }
    setProofOutput(result);
    toast.dismiss();
    toast.success('Proof generated successfully!');

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
      {error ? <>
        <Card>
          <div className="flex flex-col w-full content-center items-center">
            <p className="p-6">Error loading contract data!</p>
          </div>
        </Card>
      </> : loading || loadMore ? <>
        <Card>
          <div className="flex flex-col w-full content-center items-center">
            <p className="p-6">Loading contract data...</p>
          </div>
        </Card>
      </> : data && deployedChain && !parsedData.verified && parsedData.source ? <>
        {chainParam in parsedData.source.chains
            && parsedData.source.chains[chainParam] ? <>
          {Object.keys(parsedData.source.chains[chainParam]).map((file) =>
            <Card key={file}>
              <h3 className="text-l font-bold">{file}</h3>
              <CodeBlock
                code={parsedData.source.chains[chainParam][file]}
                language="solidity"
              />
            </Card>)}
         </> : <Card>
          <p className="text-rose-600 dark:text-rose-300">No verified contract on this chain.</p>
          <p>Please check if the contract is verified on Etherscan.</p>
         </Card>}
      </> : data && 'errorType' in parsedData ? <>
        <Card>
          <p className="text-rose-600 dark:text-rose-300">{parsedData.errorType}</p>
          <p>{parsedData.errorMessage}</p>
        </Card>
      </> : data && parsedData.verified ? <>
        <div className="">

          <div className="flex flex-col sm:flex-row">
            <Card>
              <dl>
                <dt className="text-l font-bold">Circom Version</dt>
                <dd className="pl-6">{parsedData.verified.payload.circomVersion}</dd>
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
              <p className="text-l font-bold">Proof Input Signals</p>
              <textarea
                className={`${clsInput} min-h-32`}
                onChange={(e) => setProofInputs(e.target.value)}
                value={proofInputs}
              />
              <button
                className={`
                  ${clsButton}
                  mt-3
                `}
                onClick={prove}
              >Generate Proof</button>
              {proofOutput && <>
                <p className="text-l font-bold">
                  verifyProof calldata
                </p>
                <textarea
                  className={`${clsInput} min-h-32`}
                  value={JSON.stringify(JSON.parse(proofOutput.calldata), null, 2)}
                  readOnly
                />
                <p className="text-l font-bold">Public Signals</p>
                <textarea
                  className={`${clsInput} min-h-32`}
                  value={JSON.stringify(proofOutput.proof.publicSignals, null, 2)}
                  readOnly
                />
              </>}
            </Card>
          </div>

          {circomSource && <Card>
            <h3 className="text-xl font-bold">{parsedData.verified.payload.file}</h3>
            <CodeBlock
              code={circomSource}
              language="circom"
            />
          </Card>}

          {Object.keys(parsedData.verified.payload.files)
            .filter(x => x !== parsedData.verified.payload.file).map((file, index) =>
              <DependencyCard
                {...{file}}
                hash={parsedData.verified.payload.files[file]}
                key={index}
              />)}

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
       && parsedData.source.chains[chainParam]
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


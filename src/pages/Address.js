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

import useDarkMode from '../components/useDarkMode.js';
import CodeBlock from '../components/CodeBlock.js';
import Card from '../components/Card.js';
import {SourceTree} from '../components/SourceTree.js';
import {clsIconA, clsButton, clsInput} from '../components/Layout.js';
import {
  findChain,
  setClipboard,
  verifierABI,
  extractCircomTemplate,
  inputTemplate,
  fetchBlob,
  fetchInfo,
} from '../utils.js';

export function Address() {
  const [proofInputs, setProofInputs] = useState('{}');
  const [proofOutput, setProofOutput] = useState();
  const [circomSource, setCircomSource] = useState();
  const navigate = useNavigate();
  const darkMode = useDarkMode();
  const {address, chain: chainParam} = useParams();
  const isValid = isAddress(address);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const result = await fetch(`${import.meta.env.VITE_BLOB_URL}assoc/${address}.json`);
        const data = await result.json();
        for(let chain of Object.keys(data)) {
          data[chain] = {
            pkg_name: data[chain],
            info: await fetchInfo(data[chain]),
          };
        }
        setData(data);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    isValid && loadAsyncData();
  }, []);
  const isAddressOnAnyChain = data && Object.keys(data).length > 0;
  let deployedChain;
  let isAddressOnThisChain = false;

  if(isAddressOnAnyChain && !chainParam) {
    const firstChain = Object.keys(data)[0];
    navigate(`/chain/${firstChain}/address/${address}`);
  }
  if(chainParam) {
    deployedChain = findChain(chainParam);
    isAddressOnThisChain = isAddressOnAnyChain && chainParam in data;
  }
  useEffect(() => {
    async function generateDefaultProofInput() {
      if(!data) return;
      // TODO proof generation to happen on the client
//       const source = await fetchBlob(parsedData.verified.payload.files[parsedData.verified.payload.file]);
//       setCircomSource(source);
//       if(parsedData && parsedData.verified && chainParam) {
//         const templateDetails = extractCircomTemplate(
//           source,
//           parsedData.verified.payload.tpl,
//         );
//         setProofInputs(JSON.stringify(inputTemplate(
//           templateDetails,
//           parsedData.verified.payload.params,
//         ), null, 2));
//       }
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
    setProofOutput(result);
    const success = parseInt(callResult.data) > 0;
    if(!success) {
      toast.dismiss();
      toast.error('Proof inputs failed to verify');
      return;
    }
    toast.dismiss();
    toast.success('Proof verified successfully!');

  }

  return (<div id="address">
    <Helmet>
      <title>Circuitscan - {!isValid ? 'Invalid Address' : address}</title>
    </Helmet>
    {!isValid ? (<>
      <p>Invalid Address!</p>
    </>) : (<>
      <div className="px-4 pt-6 pb-0 max-w-7xl mx-auto xl:px-0">
        <h2 className="text-l text-ellipsis overflow-hidden mb-3">
          {data && <div className="inline-block mr-1 align-middle">
            <div className={`
              flex pl-2 pr-3 py-1
              border rounded-full bg-neutral-200 dark:bg-neutral-900
              border-neutral-400 dark:border-neutral-600
              text-sm
            `}>
              {isAddressOnThisChain ? <>
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
        {data && <>
          {Object.keys(data).map((chainId) => {
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
      </> : loading ? <>
        <Card>
          <div className="flex flex-col w-full content-center items-center">
            <p className="p-6">Loading contract data...</p>
          </div>
        </Card>
      </> : data && !isAddressOnThisChain ? <>
        <Card>
          <p className="text-rose-600 dark:text-rose-300">No circuit verifier verified at this address on this chain.</p>
          <p>Learn how to use the CLI to verify this circuit verifier...</p>
         </Card>}
      </> : data && 'errorType' in data ? <>
        <Card>
          <p className="text-rose-600 dark:text-rose-300">{data.errorType}</p>
          <p>{parsedData.errorMessage}</p>
        </Card>
      </> : data && isAddressOnThisChain ? <>
        <div className="">

          <div className="flex flex-col sm:flex-row">
            <Card>
              <dl>
                <dt className="text-l font-bold">Compiler</dt>
                <dd className="pl-6">{data[chainParam].info.circomPath}</dd>
                <dt className="text-l font-bold">Protocol</dt>
                <dd className="pl-6">{data[chainParam].info.protocol}</dd>
                <dt className="text-l font-bold">SnarkJS Version</dt>
                <dd className="pl-6">{data[chainParam].info.snarkjsVersion}</dd>
                <dt className="text-l font-bold">Template</dt>
                <dd className="pl-6">{data[chainParam].info.circuit.template}</dd>
                <dt className="text-l font-bold">Params</dt>
                <dd className="pl-6">{data[chainParam].info.circuit.params
                  ? data[chainParam].info.circuit.params.join(', ')
                  : <span className="italic">None</span>
                }</dd>
                <dt className="text-l font-bold">Pubs</dt>
                <dd className="pl-6">{data[chainParam].info.circuit.pubs
                  ? data[chainParam].info.circuit.pubs.join(', ')
                  : <span className="italic">None</span>
                }</dd>
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

          <SourceTree
            pkgName={data[chainParam].pkg_name}
            rootFile={data[chainParam].info.circuit.file + '.circom'}
          />

        </div>
      </> : <>
        <p>Unkown error occurred!</p>
      </>}

    </>)}
  </div>);
}


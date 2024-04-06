import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import ReactDiffViewer from 'react-diff-viewer';
import { isAddress } from 'viem';
import { ArrowTopRightOnSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'

import useFetchJson from '../components/useFetchJson.js';
import useFetchPost from '../components/useFetchPost.js';
import useDarkMode from '../components/useDarkMode.js';
import UploadCode from '../components/UploadCode.js';
import CodeBlock from '../components/CodeBlock.js';
import Card from '../components/Card.js';

// Local or deployed
const API_URL = '/api';
// const API_URL = '';
const INPUT_CLASS = `
  p-3
  bg-slate-100 dark:bg-slate-900
  dark:text-white
  border border-zinc-300 dark:border-zinc-600
  rounded-md
`;

// TODO form for submitting a proof to be verified
export function Address() {
  const darkMode = useDarkMode();
  const {address} = useParams();
  const isValid = isAddress(address);
  const {data, loading, error, setData} = useFetchJson(
    isValid ? import.meta.env.VITE_API_URL : null,
    {
      payload: {
        action: 'get-status',
        address,
      },
    },
  );

  const dataState = useState({});
  const bundleState = useState();

  const [tpl, setTpl] = useState('');
  const [params, setParams] = useState('');
  const [pubs, setPubs] = useState('');
  const [protocol, setProtocol] = useState('groth16');

  const {post, data:postData, loading:postLoading, error:postError} = useFetchPost();

  useEffect(() => {
    if(bundleState[0]) {
      // Dependency tree has been filled, continue to form
      setTpl(dataState[0][bundleState[0]].templates[0]);
    }
  }, [bundleState[0]]);
  
  let tplArgs, validBundle;
  if(bundleState[0] && tpl) {
    validBundle = bundleState[0] in dataState[0];
    if(!validBundle) {
      bundleState[1](false);
    } else {
      tplArgs = dataState[0][bundleState[0]].code.match(
        new RegExp(`template\\s+${tpl}\\((.*?)\\)\\s*\\{`)
      );
    }
  }

  let parsedData;
  if(data) {
    if(typeof data === 'string' || 'payload' in data) {
      // Different format for function URL on AWS
      parsedData = data;
    } else {
      parsedData = JSON.parse(data.body);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await post(import.meta.env.VITE_API_URL, { payload: {
      action: 'verify',
      file: bundleState[0],
      files: dataState[0],
      params,
      pubs,
      tpl,
      protocol,
      address,
      chainId: 17000,
    }});
    setData(result);
  }

  return (<div id="address" className="p-6">
    <Helmet>
      <title>Circuitscan - {!isValid ? 'Invalid Address' : address}</title>
    </Helmet>
    {isValid ? (<>
      <h2 className="text-2xl font-bold">
        {address}&nbsp;
        <a
          href={`https://holesky.etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener"
          title="View on Block Explorer"
          className=""
        >
          <ArrowTopRightOnSquareIcon className="inline h-6 w-6" />
        </a>
      </h2>
      {loading ? <>
        <p>Loading contract data...</p>
      </> : error ? <>
        <p>Error loading contract data!</p>
      </> : data && typeof parsedData === 'string' ? <>
        <div className="">
          This contract has been verified on Etherscan but the circuit has not yet been verified here.
        </div>
        <Card>
          <CodeBlock
            code={parsedData}
            language="solidity"
          />
        </Card>
      </> : data ? <>
        <div className="">
          <div className="flex">
            {parsedData.acceptableDiff ? <>
              <CheckIcon className="h-6 w-6 text-blue-500" />
              <p>The circuit has been verified for this contract</p>
            </> : <>
              <XMarkIcon className="h-6 w-6 text-red-500" />
              <p>The verification has failed</p>
            </>}
          </div>

          {parsedData.diff.length > 1 && <>
            <Card>
              <h3 className="text-xl font-bold">Solidity Contract Diff ({parsedData.acceptableDiff ? 'Acceptable' : 'Not Accepted'})</h3>
              <div
                className="mt-6 line-numbers overflow-auto w-full bg-slate-100 dark:bg-slate-900 dark:text-white"
              >
                <ReactDiffViewer
                  newValue={parsedData.ogSource}
                  oldValue={parsedData.contract}
                  splitView={false}
                  useDarkTheme={darkMode}
                />
              </div>
            </Card>
          </>}

          <Card>
            <dl>
              <dt className="text-l font-bold">Protocol</dt>
              <dd className="pl-6">{parsedData.payload.protocol}</dd>
              <dt className="text-l font-bold">Template</dt>
              <dd className="pl-6">{parsedData.payload.tpl}</dd>
              <dt className="text-l font-bold">Params</dt>
              <dd className="pl-6">{parsedData.payload.params}</dd>
              <dt className="text-l font-bold">Pubs</dt>
              <dd className="pl-6">{parsedData.payload.pubs || <span className="italic">None</span>}</dd>
            </dl>
          </Card>

          <Card>
            <h3 className="text-xl font-bold">{parsedData.payload.file}</h3>
            <CodeBlock
              code={parsedData.payload.files[parsedData.payload.file].code}
              language="circom"
            />
          </Card>

          {Object.keys(parsedData.payload.files)
            .filter(x => x !== parsedData.payload.file).map((file, index) => <>
              <Card key={index}>
                <h3 className="text-xl font-bold">{file}</h3>
                <CodeBlock
                  code={parsedData.payload.files[file].code}
                  language="circom"
                />
              </Card>
          </>)}
        </div>
      </> : <>
        <p>Unkown error occurred!</p>
      </>}

      {(parsedData && (typeof parsedData === 'string' || !parsedData.acceptableDiff)) &&
        <Card>
          <form onSubmit={handleSubmit}>
            <h3 className="text-xl font-bold mb-8">To verify circuit, select Circom source file...</h3>
            <UploadCode {...{dataState, bundleState}} />
            {bundleState[0] && <>
              <div>
                <label className="m-4 flex">
                  <span className="p-3">Protocol:</span>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option>groth16</option>
                    <option>plonk</option>
                    <option>fflonk</option>
                  </select>
                </label>
              </div>
              <div>
                <label className="m-4 flex">
                  <span className="p-3">Template:</span>
                  <select
                    value={tpl}
                    onChange={(e) => setTpl(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    {validBundle && dataState[0][bundleState[0]].templates.map((tpl, index) =>
                      <option key={index}>{tpl}</option>
                    )}
                  </select>
                </label>
              </div>
              {tplArgs && tplArgs[1] && <div>
                <label className="m-4 flex">
                  <span className="p-3">Params:</span>
                  <input
                    value={params}
                    onChange={(e) => setParams(e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <span className="p-3 italic font-mono">{tplArgs[1]}</span>
                </label>
              </div>}
              <div>
                <label className="m-4 flex">
                  <span className="p-3">Pubs:</span>
                  <input
                    value={pubs}
                    onChange={(e) => setPubs(e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <span className="p-3 italic">Comma separated</span>
                </label>
              </div>
              <div className="flex p-4 items-center">
                <button
                  className={`p-4 mr-4 bg-slate-100 dark:bg-slate-900 dark:text-white rounded-md
                    hover:bg-slate-300 active:bg-slate-400
                    dark:hover:bg-slate-800 dark:active:bg-slate-700
                    border border-zinc-300 dark:border-zinc-600
                    `}
                >Submit</button>
                {postLoading ? <p>Loading...</p> :
                  postError  ? <p>Error fetching result!</p> :
                  postData   ? <p>Process completed.</p> : null}
              </div>
            </>}
            </form>
          </Card>}
    </>) : (<>
      <p>Invalid Address!</p>
    </>)}
  </div>);
}


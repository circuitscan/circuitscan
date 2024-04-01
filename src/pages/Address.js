import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import ReactDiffViewer from 'react-diff-viewer';
import { isAddress } from 'viem';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid'

import useFetchJson from '../components/useFetchJson.js';
import useFetchPost from '../components/useFetchPost.js';
import UploadCode from '../components/UploadCode.js';
import CodeBlock from '../components/CodeBlock.js';

const INPUT_CLASS = "p-3 bg-slate-100 dark:bg-slate-900 dark:text-white";

export function Address() {
  const {address} = useParams();
  const isValid = isAddress(address);
  const {data, loading, error} = useFetchJson(isValid ? `/api` : null, {
    payload: {
      action: 'get-verified',
      address,
    },
  });

  const dataState = useState({});
  const bundleState = useState();

  const [tpl, setTpl] = useState('');
  const [params, setParams] = useState('');
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

  if(postData) {
    console.log(JSON.parse(postData.body));
  }

  let parsedData;
  if(data) {
    parsedData = JSON.parse(data.body);
  }

  function handleSubmit(event) {
    event.preventDefault();
    post('/api', { payload: {
      action: 'verify',
      file: bundleState[0],
      files: dataState[0],
      params,
      tpl,
      protocol,
      address,
      chainId: 17000,
    }});
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
        <p>Loading verified contract source from Etherscan...</p>
      </> : error ? <>
        <p>Error loading verified contract source from Etherscan!</p>
      </> : data && data.statusCode === 404 ? <>
        <div
          className=""
        >
          This contract has not been verified on Etherscan.
        </div>
      </> : data && data.statusCode === 200 ? <>
        <div
          className=""
        >
          <p>The circuit has been verified for this contract</p>
          <dl>
            <dt className="text-l font-bold">Protocol</dt>
            <dd className="pl-6">{parsedData.payload.protocol}</dd>
            <dt className="text-l font-bold">Template</dt>
            <dd className="pl-6">{parsedData.payload.tpl}</dd>
            <dt className="text-l font-bold">Params</dt>
            <dd className="pl-6">{parsedData.payload.params}</dd>
          </dl>

          <h3 className="text-xl font-bold">{parsedData.payload.file}</h3>
          <CodeBlock
            code={parsedData.payload.files[parsedData.payload.file].code}
            language="circom"
          />

          {Object.keys(parsedData.payload.files)
            .filter(x => x !== parsedData.payload.file).map(file => <>
              <h3 className="text-xl">{file}</h3>
              <CodeBlock
                code={parsedData.payload.files[file].code}
                language="circom"
              />
          </>)}

          <h3 className="text-xl">Solidity Contract Diff</h3>
          <div
            className="line-numbers overflow-auto w-full max-h-96 bg-slate-100 dark:bg-slate-900 dark:text-white"
          >
            <ReactDiffViewer
              oldValue={parsedData.ogSource}
              newValue={parsedData.contract}
              splitView={false}
              useDarkTheme={true}
            />
          </div>
        </div>
      </> : <>
        <form
            onSubmit={handleSubmit}
            className="p-8 m-5 bg-slate-200 dark:bg-slate-600 rounded-lg">
          <h3 className="text-xl mb-8">To verify circuit, select Circom source file...</h3>
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
            <div className="flex p-4 items-center">
              <button
                className={`p-4 mr-4 bg-slate-100 dark:bg-slate-900 dark:text-white rounded-md
                  hover:bg-slate-300 active:bg-slate-400
                  dark:hover:bg-slate-800 dark:active:bg-slate-700
                  `}
              >Submit</button>
              {postLoading ? <p>Loading...</p> :
                postError  ? <p>Error fetching result!</p> :
                postData   ? <p>Result success!</p> : null}
            </div>
          </>}
        </form>
      </>}
    </>) : (<>
      <p>Invalid Address!</p>
    </>)}
  </div>);
}


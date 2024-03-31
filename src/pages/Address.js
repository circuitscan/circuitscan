import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import { isAddress } from 'viem';
import useFetchJson from '../components/useFetchJson.js';
import useFetchPost from '../components/useFetchPost.js';
import CodeBlock from '../components/CodeBlock.js';
import UploadCode from '../components/UploadCode.js';

export function Address() {
  const {address} = useParams();
  const isValid = isAddress(address);
  const dataState = useState({});
  const bundleState = useState();
  const [params,setParams] = useState('');
  const [tpl,setTpl] = useState('');
  const { post, data:postData, loading:postLoading, error:postError } = useFetchPost();
  // TODO cache the src to avoid api overages
  const {data, loading, error} = useFetchJson(isValid ? `https://api-holesky.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${import.meta.env.VITE_ETHERSCAN_API_KEY}` : null);

  useEffect(() => {
    if(bundleState[0]) {
      setTpl(dataState[0][bundleState[0]].templates[0]);
    }
  }, [bundleState[0]]);
  
  let verifiedSrc, protocol, tplArgs, validBundle;
  if(data) {
    try {
      const inner = JSON.parse(data.result[0].SourceCode.slice(1, -1));
      verifiedSrc = inner.sources[Object.keys(inner.sources)[0]].content;
      if(verifiedSrc.match(/Groth16Verifier/)) protocol = 'groth16';
      else if(verifiedSrc.match(/PlonkVerifier/)) protocol = 'plonk';
      else if(verifiedSrc.match(/FflonkVerifier/)) protocol = 'fflonk';
    } catch (error) {
      // Doesn't matter
    }
  }
  if(bundleState[0] && tpl) {
    validBundle = bundleState[0] in dataState[0];
    if(!validBundle) {
      bundleState[1](false);
    } else {
      tplArgs = dataState[0][bundleState[0]].code.match(new RegExp(`template\\s+${tpl}\\((.*?)\\)\\s*\\{`));
    }
  }

  if(postData) {
    console.log(JSON.parse(postData.body));
  }

  function handleSubmit(event) {
    event.preventDefault();
    post('/api', { payload: {
      file: bundleState[0],
      files: dataState[0],
      params,
      tpl,
      protocol,
      verifiedSrc,
    }});
  }

  return (<div id="address" className="p-6">
    <Helmet>
      <title>Circuitscan - {!isValid ? 'Invalid Address' : address}</title>
    </Helmet>
    {isValid ? (<>
      <h2 className="text-2xl font-bold">{address}</h2>
      {loading ? <>
        <p>Loading verified contract source from Etherscan...</p>
      </> : error ? <>
        <p>Error loading verified contract source from Etherscan!</p>
      </> : verifiedSrc ? <>
        <div
          className=""
        >
          <CodeBlock
            language="solidity"
            code={verifiedSrc}
          />
          <div>
            <dl>
              <dt className="font-bold">Protocol</dt>
              <dd className="font-mono">{protocol || <em className="italic">Unknown</em>}</dd>
            </dl>
          </div>
          {protocol && <form
              onSubmit={handleSubmit}
              className="p-8 m-5 bg-slate-200 dark:bg-slate-600 rounded-lg">
            <h3 className="text-xl mb-8">To verify circuit, select Circom source file...</h3>
            <UploadCode {...{dataState, bundleState}} />
            {bundleState[0] && <>
              <div>
                <label className="m-4 flex">
                  <span className="p-3">Template:</span>
                  <select
                    value={tpl}
                    onChange={(e) => setTpl(e.target.value)}
                    className="p-3 bg-slate-100 dark:bg-slate-900 dark:text-white"
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
                    className="p-3 bg-slate-100 dark:bg-slate-900 dark:text-white"
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
          </form>}
        </div>
      </> : <>
        <p
          className=""
        >This contract has not been verified.</p>
      </>}
    </>) : (<>
      <p>Invalid Address!</p>
    </>)}
  </div>);
}


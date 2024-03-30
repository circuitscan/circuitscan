import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import { isAddress } from 'viem';
import useFetchJson from '../components/useFetchJson.js';
import CodeBlock from '../components/CodeBlock.js';


export function Address() {
  const {address} = useParams();
  const isValid = isAddress(address);
  // TODO cache the src to avoid api overages
  const {data, loading, error} = useFetchJson(isValid ? `https://api-holesky.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${import.meta.env.VITE_ETHERSCAN_API_KEY}` : null);
  
  let verifiedSrc;
  if(data) {
    try {
      const inner = JSON.parse(data.result[0].SourceCode.slice(1, -1));
      verifiedSrc = inner.sources[Object.keys(inner.sources)[0]].content;
    } catch (error) {
      // Doesn't matter
    }
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
          className="line-numbers w-full h-96 bg-slate-100 dark:bg-slate-900 dark:text-white"
        >
          <CodeBlock
            language="solidity"
            code={verifiedSrc}
          />
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


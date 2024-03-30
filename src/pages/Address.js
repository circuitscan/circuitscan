import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import { isAddress } from 'viem';
import useFetchJson from '../components/useFetchJson.js';

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

  return (<div id="address">
    <Helmet>
      <title>Circuitscan - {!isValid ? 'Invalid Address' : address}</title>
    </Helmet>
    {isValid ? (<>
      <p>Hello, {address}</p>
      {loading ? <>
        <p>Loading verified contract source from Etherscan...</p>
      </> : error ? <>
        <p>Error loading verified contract source from Etherscan!</p>
      </> : verifiedSrc ? <>
        <textarea
          className="dark:bg-slate-800 dark:text-white"
          value={verifiedSrc}
        />
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


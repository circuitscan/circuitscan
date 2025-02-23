import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {isAddress} from 'viem';

import AddressHeader from '../components/AddressHeader.js';
import Card from '../components/Card.js';
import {CircomDetails} from '../components/CircomDetails.js';
import {Groth16MultiDetails} from '../components/Groth16MultiDetails.js';
import {NoirDetails} from '../components/NoirDetails.js';
import {clsIconA} from '../components/Layout.js';
import {
  findChain,
  fetchInfo,
} from '../utils.js';

export default function Address() {
  const navigate = useNavigate();
  const {address: addrParam, chain: chainParam} = useParams();
  const address = String(addrParam || '').toLowerCase();
  const isValid = isAddress(address);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const result = await fetch(`${import.meta.env.VITE_BLOB_URL}assoc/${address.toLowerCase()}.json`);
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

    isAddress(address) && loadAsyncData();
  }, [address]);
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

  return (<div id="address">
    <Helmet>
      <title>Circuitscan - {!isValid ? 'Invalid Address' : address}</title>
    </Helmet>
    {!isValid ? (<>
      <Card>
        <p>Invalid Address!</p>
      </Card>
    </>) : (<>
      <div className="px-4 pt-6 pb-0 mx-auto">
        <AddressHeader {...{address, data, deployedChain, isAddressOnThisChain}} />
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
        {data[chainParam].info.circuit ?
          <CircomDetails
            pkgName={data[chainParam].pkg_name}
            info={data[chainParam].info}
            {...{chainParam, address}}
            />
          : data[chainParam].info.type === 'groth16multi' ?
            <Groth16MultiDetails
              info={data[chainParam].info}
              {...{chainParam, address}}
              />
          : data[chainParam].info.type === 'noir' ?
            <NoirDetails
              pkgName={data[chainParam].pkg_name}
              info={data[chainParam].info}
              {...{chainParam, address}}
              />
          : <Card>
              <p>Invalid details!</p>
            </Card>}
      </> : <>
        <p>Unkown error occurred!</p>
      </>}

    </>)}
  </div>);
}


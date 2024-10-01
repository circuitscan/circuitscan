import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {isAddress} from 'viem';
import {
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
  FolderArrowDownIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import bsUrls from 'blockscout-urls';

import Card from '../components/Card.js';
import {CircomDetails} from '../components/CircomDetails.js';
import {Groth16MultiDetails} from '../components/Groth16MultiDetails.js';
import {NoirDetails} from '../components/NoirDetails.js';
import {clsIconA} from '../components/Layout.js';
import {
  findChain,
  setClipboard,
  fetchInfo,
  formatBytes,
} from '../utils.js';

export default function Address() {
  const navigate = useNavigate();
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
      <p>Invalid Address!</p>
    </>) : (<>
      <div className="px-4 pt-6 pb-0 mx-auto">
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

          <span className="whitespace-nowrap inline-block">
            <a
              href={`web3://${address}`}
              onClick={() => setClipboard(address)}
              title="Copy Address to Clipboard"
              className={`${clsIconA} print:hidden`}
            >
              <DocumentDuplicateIcon className="inline h-5 w-5" />
            </a>&nbsp;

            {deployedChain && <a
              href={`${deployedChain.id in bsUrls ? 'https://' + bsUrls[deployedChain.id] : deployedChain.blockExplorers.default.url}/address/${address}`}
              target="_blank"
              rel="noopener"
              title="View on Block Explorer"
              className={`${clsIconA} print:hidden`}
            >
              <ArrowTopRightOnSquareIcon className="inline h-5 w-5" />
            </a>}&nbsp;

            {isAddressOnThisChain && data[chainParam].info.pkgSize && <><a
              href={`${import.meta.env.VITE_BLOB_URL}build/${data[chainParam].pkg_name}/pkg.zip`}
              target="_blank"
              rel="noopener"
              title={`Download Entire Build (${formatBytes(data[chainParam].info.pkgSize)})`}
              className={`${clsIconA} print:hidden`}
            >
              <FolderArrowDownIcon className="inline h-5 w-5" />
            </a>&nbsp;</>}

            {isAddressOnThisChain && <a
              href={`https://remix.ethereum.org/address/${address}`}
              target="_blank"
              rel="noopener"
              title="View on Remix IDE"
              className={`${clsIconA} print:hidden`}
            >
              <PencilSquareIcon className="inline h-5 w-5" />
            </a>}
          </span>

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


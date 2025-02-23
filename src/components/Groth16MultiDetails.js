import { useEffect, useState } from 'react';
import {
  FolderArrowDownIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

import Card from './Card.js';
import {CircomDetails} from './CircomDetails.js';
import {clsButton, clsIconA} from './Layout.js';
import {
  fetchInfo,
  formatBytes,
} from '../utils.js';

export function Groth16MultiDetails({ info, chainParam }) {
  const [selectedVerifier, setSelectedVerifier] = useState('0');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        setProgress(0);
        setError(null);
        setLoading(true);
        setSelectedVerifier('0');
        const verifiers = [];
        for(let verifier of info.payload.verifiers) {
          const result = await fetch(`${import.meta.env.VITE_BLOB_URL}assoc/${verifier.address.toLowerCase()}.json`);
          const parsed = await result.json();
          const verifierInfo = await fetchInfo(parsed[verifier.chainId]);
          verifiers.push({
            pkgName: parsed[verifier.chainId],
            info: verifierInfo,
            address: verifier.address,
            chainId: verifier.chainId,
          });
          setProgress(verifiers.length);
        }
        setData({ verifiers });
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, [info, chainParam]);
  return (<>
    {error ? <>
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p className="p-6">Error loading multi-verifier data!</p>
        </div>
      </Card>
    </> : loading ? <>
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p className="p-6">Loading multi-verifier data...</p>
          <progress
            className="rounded-md w-full h-4 bg-gray-200 dark:bg-gray-800"
            max={info.payload.verifiers.length}
            value={progress}
          />
        </div>
      </Card>
    </> : <>
      <Card>
        <p className="text-l font-bold pb-1">
          Multi-verifier
          {info.payload.modifier && <>&nbsp;(<a
            href={`https://github.com/circuitscan/circuitscan/blob/main/server/modifiers/${info.payload.modifier}.js`}
            target="_blank"
            rel="noopener"
            className={`${clsIconA}`}
          >{info.payload.modifier}</a>)</>}
          &nbsp;<a
            href={`https://circuitscan.readthedocs.io/en/latest/usage-circom.html#verify-a-circom-groth16-multi-verifier-already-deployed-on-chain`}
            target="_blank"
            rel="noopener"
            className={`${clsIconA}`}
            title="View multi-verifier documentation..."
          >
            <QuestionMarkCircleIcon className="inline h-5 w-5" />
          </a>
        </p>
        <select
          className={`w-[calc(100%-3rem)] ${clsButton}`}
          onChange={(e) => setSelectedVerifier(e.target.value)}
          value={selectedVerifier}
        >
          {data.verifiers.map((verifier, index) =>
            <option
              key={verifier.pkgName}
              value={index}
            >
              {verifier.info.circuit.template}({verifier.info.circuit.params && verifier.info.circuit.params.join(', ')})
            </option>
          )}
        </select>
        <a
          href={`${import.meta.env.VITE_BLOB_URL}build/${data.verifiers[selectedVerifier].pkgName}/pkg.zip`}
          target="_blank"
          rel="noopener"
          title={`Download Entire Build (${formatBytes(data.verifiers[selectedVerifier].info.pkgSize)})`}
          className={`${clsIconA} print:hidden`}
        >
          <FolderArrowDownIcon className="inline h-5 w-5" />
        </a>
      </Card>
      {selectedVerifier &&
        <CircomDetails
          pkgName={data.verifiers[selectedVerifier].pkgName}
          info={data.verifiers[selectedVerifier].info}
          chainParam={data.verifiers[selectedVerifier].chainId}
          address={data.verifiers[selectedVerifier].address}
          />}
    </>}
  </>);
}

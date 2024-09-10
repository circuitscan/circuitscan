import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { isAddress } from 'viem';
import * as chains from 'viem/chains';

import {PopupDialog} from './PopupDialog.js';
import {clsInput, clsIconA} from './Layout.js';
import {removeDuplicates, findChain} from '../utils.js';

const chainsFixed = removeDuplicates(chains);

export default function Directory() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  async function reload(cache) {
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const result = await fetch(`${import.meta.env.VITE_BLOB_URL}directory.json`, {cache});
      const data = await result.json();
      setData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload() }, []);
  // Reloads after updates should break the cache
  useEffect(() => { reload('reload') }, [reloadCount]);

  if(loading) return(<>
    <p className="py-4">Loading directory...</p>
  </>);

  if(error) return (<>
    <div className="py-4">
      Error loading circuit directory.
      <SubmitContract {...{setReloadCount}} />
    </div>
  </>);

  if(data) return (<>
    <ul className="py-4">
    {Object.keys(data.projects).sort().map(projectName =>
      <li key={projectName}>
        <span className="text-lg font-bold block">{projectName}</span>
        <ul className="pl-2">
          {Object.keys(data.projects[projectName]).map(chainId =>
            <li key={chainId}>
              <span className="block">{findChain(chainId).name}</span>
              <ul className="pl-2">
                {Object.keys(data.projects[projectName][chainId]).map(contractName =>
                  <li key={contractName}>
                    <span className="block">{contractName}</span>
                    <ul className="pl-2">
                      {data.projects[projectName][chainId][contractName].contracts.map(contract =>
                        <li key={contract}>
                          <Link
                            to={`/chain/${chainId}/address/${contract}`}
                            className={`${clsIconA}`}
                          >{contract}</Link>
                        </li>
                      )}
                    </ul>
                  </li>
                )}
              </ul>
            </li>
          )}
        </ul>
      </li>
    )}
    </ul>
    <SubmitContract {...{data, setReloadCount}} />
  </>);
}

function SubmitContract({ setReloadCount, data={projects:{}} }) {
  const [chainId, setChainId] = useState(1);
  const [contractAddress, setContractAddress] = useState('');
  const [contractName, setContractName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [contractNames, setContractNames] = useState([]);
  const [projectNames, setProjectNames] = useState([]);
  const inputRef = useRef(null);

// TODO infinite loop!
//   useEffect(() => {
//     setProjectNames(Object.keys(data.projects));
//   }, [data]);
// 
  useEffect(() => {
    setContractNames(projectName in data.projects
      ? Object.keys(data.projects[projectName])
      : []
    );
  }, [projectName]);

  async function submitForm(event, hideForm) {
    if(!isAddress(contractAddress)) {
      toast.error('Invalid contract address!');
      return;
    }
    if(isNaN(chainId)
        || Object.values(chains).findIndex(chain => chain.id === Number(chainId)) === -1) {
      toast.error('Invalid chain ID!');
      return;
    }
    hideForm();
    toast.loading('Submitting contract...');
    try {
      const result = await fetch(import.meta.env.VITE_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: {
            action: 'insertDirectoryContract',
          },
          chainId: Number(chainId),
          contractAddress,
          contractName,
          projectName,
        }),
      });
      const data = await result.json();
      if('errorType' in data) {
        toast.dismiss();
        toast.error(data.errorMessage);
        return;
      }
      setReloadCount(n => n + 1);
      toast.dismiss();
      toast.success('Successfully submitted contract to directory!');
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error(err.message);
    }
  }

  return (
    <PopupDialog
      linkText="Submit contract..."
      onSubmit={submitForm}
      {...{inputRef}}
    >
      <label className="block">
        <span className="dark:text-slate-200 block">Contract Address:</span>
        <input
          className={`${clsInput} mt-1 mb-4`}
          onChange={(e) => setContractAddress(e.target.value)}
          value={contractAddress}
          ref={inputRef}
        />
      </label>
      <label className="block">
        <span className="dark:text-slate-200 block">Chain ID:</span>
        <select
          className={`${clsInput} mt-1 mb-4`}
          onChange={(e) => setChainId(e.target.value)}
          value={chainId}
        >
          {Object.values(chainsFixed).map(chain =>
            <option
              key={chain.id}
              value={chain.id}
            >{chain.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="dark:text-slate-200 block">Project Name:</span>
        <input
          className={`${clsInput} mt-1 mb-4`}
          onChange={(e) => setProjectName(e.target.value)}
          value={projectName}
          list="directory-project-names"
        />
        <datalist id="directory-project-names">
          {projectNames.map(name =>
            <option
              key={name}
              value={name}
            />
          )}
        </datalist>
      </label>
      <label className="block">
        <span className="dark:text-slate-200 block">Contract Name:</span>
        <input
          className={`${clsInput} mt-1 mb-4`}
          onChange={(e) => setContractName(e.target.value)}
          value={contractName}
          list="directory-contract-names"
        />
        <datalist id="directory-contract-names">
          {contractNames.map(name =>
            <option
              key={name}
              value={name}
            />
          )}
        </datalist>
      </label>
    </PopupDialog>
  );
}

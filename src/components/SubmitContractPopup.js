import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { isAddress } from 'viem';
import * as chains from 'viem/chains';

import {PopupDialog} from './PopupDialog.js';
import {clsInput} from './Layout.js';
import {removeDuplicates} from '../utils.js';

const chainsFixed = removeDuplicates(chains);

export default function SubmitContractPopup({ setDeployment }) {
  const [chainId, setChainId] = useState(1);
  const [contractAddress, setContractAddress] = useState('');
  const inputRef = useRef(null);

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
    setDeployment({
      chainId: Number(chainId),
      contractAddress,
    });
  }

  return (
    <PopupDialog
      linkText="Or, verify an already-deployed contract..."
      linkClass="underline underline-offset-2"
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
    </PopupDialog>
  );
}

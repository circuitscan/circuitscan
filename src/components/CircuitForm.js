import { useEffect, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'

import UploadCode from '../components/UploadCode.js';
import Card from '../components/Card.js';
import {clsButton, clsInput} from '../components/Layout.js';

export default function CircuitForm({
  submitHandler,
  disableSubmit,
}) {
  const dataState = useState({});
  const bundleState = useState();

  const [tpl, setTpl] = useState('');
  const [params, setParams] = useState('');
  const [pubs, setPubs] = useState('');
  const [protocol, setProtocol] = useState('groth16');
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

  async function handleSubmit(event) {
    event.preventDefault();
    submitHandler({
      file: bundleState[0],
      files: dataState[0],
      params,
      pubs,
      tpl,
      protocol,
    });
  }
  return (<form onSubmit={handleSubmit}>
    <UploadCode {...{dataState, bundleState}} />
    {bundleState[0] && <>
      <div>
        <label className="m-4 flex">
          <span className="p-3">Protocol:</span>
          <select
            value={protocol}
            onChange={(e) => setProtocol(e.target.value)}
            className={clsInput}
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
            className={clsInput}
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
            className={clsInput}
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
            className={clsInput}
          />
          <span className="p-3 italic">Comma separated</span>
        </label>
      </div>
      <div className="flex p-4 items-center">
        <button
          disabled={disableSubmit}
          className={clsButton}
        >
          Submit
        </button>
      </div>
    </>}
  </form>);
}

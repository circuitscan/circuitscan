import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { toast } from 'react-hot-toast';
import {
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

import {
  joinPaths,
  getImports,
} from '../utils.js';
import {clsButton, clsInput, clsIconA} from '../components/Layout.js';


const SNARKJS_VERSIONS = [
  '0.7.5',
  '0.7.4',
  '0.7.3',
  '0.7.2',
  '0.7.1',
  '0.7.0',
  '0.6.11',
];

const CIRCOM_VERSIONS = [
  '2.2.2',
  '2.2.1',
  '2.2.0',
  '2.1.9',
  '2.1.8',
  '2.1.7',
  '2.1.6',
  '2.1.5',
  '2.1.4',
  '2.1.3',
  '2.1.2',
  '2.1.1',
  '2.1.0',
  '2.0.9',
  '2.0.8',
];

export function CircuitName({circuit}) {
  return (
    <span>{circuit.circomMain.templateName}({circuit.circomMain.args.join(', ')})</span>
  );
}

export const Options = forwardRef(function({circuit, zipContents}, payloadRef) {
  const [circomVersion, setCircomVersion] = useState(CIRCOM_VERSIONS[0]);
  const [snarkjsVersion, setSnarkjsVersion] = useState(SNARKJS_VERSIONS[0]);
  const [protocol, setProtocol] = useState('plonk');
  const [finalZKey, setFinalZKey] = useState('');
  const [ptauUrl, setPtauUrl] = useState('');
  const [prime, setPrime] = useState('bn128');
  const [optimization, setOptimization] = useState(1);

  useImperativeHandle(payloadRef, () => ({
    serializeState: () => ({
      pipeline: 'circom',
      files: circuit.sources.reduce((out, cur) => {
        out[cur] = { code: zipContents[cur].replace(circuit.circomMain.full, '') };
        return out;
      }, {}),
      finalZkey: protocol === 'groth16' ? finalZKey || undefined : undefined,
      snarkjsVersion,
      circomPath: `circom-v${circomVersion}`,
      optimization,
      protocol,
      ptauSize: ptauUrl || undefined,
      prime,
      circuit: {
        file: circuit.filename.slice(0, -7), // remove .circom
        version: circomVersion,
        template: circuit.circomMain.templateName,
        params: circuit.circomMain.args,
        pubs: circuit.circomMain.publicSignals,
      },
    }),
  }));

  return (<>
    <label className="block">
      <span>Circom Version:</span>
      <select
        value={circomVersion}
        onChange={(e) => setCircomVersion(e.target.value)}
        className={`${clsInput}`}
      >
        {CIRCOM_VERSIONS.map((version, index) =>
          <option key={version} value={version}>{version}</option>)}
      </select>
    </label>
    <label className="block">
      <span>SnarkJS Version:</span>
      <select
        value={snarkjsVersion}
        onChange={(e) => setSnarkjsVersion(e.target.value)}
        className={`${clsInput}`}
      >
        {SNARKJS_VERSIONS.map((version, index) =>
          <option key={version} value={version}>{version}</option>)}
      </select>
    </label>
    <label className="block">
      <span>Protocol:</span>
      <select
        value={protocol}
        onChange={(e) => setProtocol(e.target.value)}
        className={`${clsInput}`}
      >
        <option value="groth16">groth16</option>
        <option value="plonk">plonk</option>
        <option value="fflonk">fflonk</option>
      </select>
    </label>
    {protocol === 'groth16' && <>
      <label className="block">
        <span>Final ZKey URL:</span>
        <input
          value={finalZKey}
          onChange={(e) => setFinalZKey(e.target.value)}
          className={`${clsInput}`}
          placeholder="Leave blank to use random entropy"
        />
        <p className="text-sm">
          Groth16 protocol uses a circuit-specific setup to operate securely.<br />
          Specify the URL of the final ZKey (proving key) for this circuit.<br />
          This field is required to verify an already-deployed circuit verifier.
          &nbsp;<a
            href={`https://circuitscan.readthedocs.io/en/latest/usage-circom.html#k-proving-key`}
            target="_blank"
            rel="noopener"
            className={`${clsIconA}`}
            title="View documentation..."
          >
            <QuestionMarkCircleIcon className="inline h-5 w-5" />
          </a>
        </p>
      </label>
    </>}
    <label className="block">
      <span>PTAU File URL:</span>
      <input
        value={ptauUrl}
        onChange={(e) => setPtauUrl(e.target.value)}
        className={`${clsInput}`}
        placeholder="Leave blank to use default Hermez PTAU"
      />
      <p className="text-sm">
        Specify the URL of a different PTAU file if not using the default Hermez ceremony
        &nbsp;<a
          href={`https://circuitscan.readthedocs.io/en/latest/usage-circom.html#t-ptau`}
          target="_blank"
          rel="noopener"
          className={`${clsIconA}`}
          title="View documentation..."
        >
          <QuestionMarkCircleIcon className="inline h-5 w-5" />
        </a>
      </p>
    </label>
    <label className="block">
      <span>Prime:</span>
      <select
        value={prime}
        onChange={(e) => setPrime(e.target.value)}
        className={`${clsInput}`}
      >
        <option value="bn128">bn128</option>
      </select>
      <p className="text-sm">
        Use CLI for other primes
        &nbsp;<a
          href={`https://circuitscan.readthedocs.io/en/latest/usage-circom.html#prime`}
          target="_blank"
          rel="noopener"
          className={`${clsIconA}`}
          title="View documentation..."
        >
          <QuestionMarkCircleIcon className="inline h-5 w-5" />
        </a>
      </p>
    </label>
    <label className="block">
      <span>Optimization:</span>
      <select
        value={optimization}
        onChange={(e) => setOptimization(Number(e.target.value))}
        className={`${clsInput}`}
      >
        <option value="0">0</option>
        <option value="1">1</option>
        <option value="2">2</option>
      </select>
      <p className="text-sm">
        Set Circom optimization level
        &nbsp;<a
          href={`https://docs.circom.io/getting-started/compilation-options/#flags-and-options-related-to-the-r1cs-optimization`}
          target="_blank"
          rel="noopener"
          className={`${clsIconA}`}
          title="View documentation..."
        >
          <QuestionMarkCircleIcon className="inline h-5 w-5" />
        </a>
      </p>
    </label>
  </>);
});

export function parse(fileContent, filename, zipContents) {
  const circomMain = parseMainComponent(removeComments(fileContent));
  if(circomMain) {
    let sources = [ filename ];
    let i = 0;
    while(i < sources.length) {
      if(!(sources[i] in zipContents)) return {
        type: 'circom',
        filename,
        circomMain,
        error: `Missing ${sources[i]}`,
      };
      const imports = getImports(zipContents[sources[i]]).map(path => joinPaths(sources[i], path));
      sources = [...new Set([ ...sources, ...imports ])];
      i++;
    }

    return {
      type: 'circom',
      sources,
      filename,
      circomMain,
    };
  }
}

function removeComments(source) {
  // Regular expression to match single-line and multi-line comments
  const regex = /\/\/.*|\/\*[\s\S]*?\*\//g;
  // Replace comments with an empty string
  return source.replace(regex, '');
}

function parseMainComponent(code) {
    const regex = /component\s+main\s*(\{\s*public\s*\[\s*([^\]]*)\s*\]\s*\})?\s*=\s*([a-zA-Z0-9_]+)\(([^)]*)\);/;
    const match = code.match(regex);

    if (!match) {
        return null;
    }

    const publicSignals = match[2] ? match[2].split(',').map(signal => signal.trim()) : [];
    const templateName = match[3];
    const args = match[4] ? match[4].split(',').map(arg => arg.trim()) : [];

    return {
        publicSignals,
        templateName,
        args,
        full: match[0],
    };
}

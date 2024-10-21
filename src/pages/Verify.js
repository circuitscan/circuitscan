import React, { useState, useEffect, useRef } from "react";
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import JSZip from "jszip";
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

import {clsButton, clsInput, clsIconA} from '../components/Layout.js';
import Card from '../components/Card.js';
import FileDropZone from '../components/FileDropZone.js';
import Wizard from '../components/Wizard.js';
import useLocalStorageState from '../components/useLocalStorageState.js';
import GenerateKey from '../components/GenerateKey.js';
import * as circom from '../components/CircomCompile.js';

const MAX_SOURCE_SIZE = 10 * 1024 * 1024; // 10 MB


const INSTANCE_SIZES = {
  4: 't3.medium',
  8: 't3.large',
  16: 'r7i.large',
  32: 'r7i.xlarge',
  64: 'r7i.2xlarge',
  128: 'r7i.4xlarge',
  256: 'r7i.8xlarge',
  384: 'r7i.12xlarge',
  512: 'r7i.16xlarge',
};

export default function VerifyPage({}) {
  const [zipContents, setZipContents] = useState({});
  const [circuit, setCircuit] = useState({});
  const [payload, setPayload] = useState(null);
  const [instanceSize, setInstanceSize] = useState(() => Object.values(INSTANCE_SIZES)[0]);
  const payloadRef = useRef();
  const [apiKey, setApiKey] = useLocalStorageState('cs-apikey', '');

  function handleSubmit(event) {
    event.preventDefault();
    const payload = payloadRef.current.serializeState();
    if(payload) console.log(payload);

  }

  return (<Card>
    <Helmet>
      <title>Circuitscan - Verify Circuit</title>
    </Helmet>
    <Wizard
      currentStep={
        !apiKey ? -1 :
        circuit.type ? 1 :
        0
      }
      steps={[
        {
          title: 'Select Circuit',
          children: <ZipFileUploader {...{setCircuit, zipContents, setZipContents}} />,
        },
        {
          title: 'Compiler Options',
          children: <form onSubmit={handleSubmit} className={`
              flex flex-col space-y-4
            `}>
              <button
                onClick={() => setCircuit({})}
                className={`${clsIconA} self-start pt-5`}
                title="Select a different circuit..."
                type="button"
              >
                <ArrowLeftIcon className="inline h-9 w-9" />
              </button>
              <h2 className={`
                text-xl pb-3
                border-b border-neutral-300 dark:border-neutral-600
              `}>
                Compiling&nbsp;
                {circuit.type === 'circom' && <circom.CircuitName {...{circuit}} />}
                &hellip;
              </h2>
              <circom.Options {...{circuit, zipContents}} ref={payloadRef} />
              <label className="block">
                <span>Instance Size:</span>
                <select
                  value={instanceSize}
                  onChange={(e) => setInstanceSize(e.target.value)}
                  className={`${clsInput}`}
                >
                  {Object.entries(INSTANCE_SIZES).map((entry, index) =>
                    <option key={entry[0]} value={entry[1]}>{entry[0]}</option>)}
                </select>
                <p className="text-sm">
                  GB memory needed to compile this circuit
                  &nbsp;<a
                    href={`https://circuitscan.readthedocs.io/en/latest/usage-circom.html#i-instance`}
                    target="_blank"
                    rel="noopener"
                    className={`${clsIconA}`}
                    title="View documentation..."
                  >
                    <QuestionMarkCircleIcon className="inline h-5 w-5" />
                  </a>
                </p>
              </label>
              <div className="flex flex-col p-3">
                <button
                  className={`${clsButton} self-center`}
                  type="submit"
                >
                  Compile circuit
                </button>
              </div>
            </form>,
        },
        {
          title: 'Compiler Status',
        },
        {
          title: 'Verify or Deploy',
        },
      ]}
    />
    {!apiKey && <>
      <h2 className={`
        text-xl pt-6 pb-3
        border-b border-neutral-300 dark:border-neutral-600
      `}>Verify Circuit</h2>
      <p className="py-4">Verify (and optionally deploy) a circuit verifier without installing anything on your computer:</p>
      <ol className="list-decimal ml-5 pb-7">
        <li>Submit ZIP file containing circuit source directory</li>
        <li>Configure compiler settings</li>
        <li>Verify existing on-chain verifier or deploy anew</li>
      </ol>
      <p>To begin, connect your wallet and sign a message to create an API Key.</p>
      <p>Generating an API Key does not cost anything and does not require any transactions.</p>
      <GenerateKey
        className="flex flex-col space-y-4 mt-5 items-center"
      />
    </>}
  </Card>);
}

function ZipFileUploader({setCircuit, zipContents, setZipContents}) {
  const [circuits, setCircuits] = useState([]);

  const handleFileChange = async (file) => {
    if (!file || file.type !== "application/zip") {
      toast.error("Please upload a valid ZIP file.");
      return;
    }

    try {
      const zip = new JSZip();
      const content = await file.arrayBuffer();
      const loadedZip = await zip.loadAsync(content);

      // Loop through first time to extract all files
      const files = {};
      for (const filename in loadedZip.files) {
        const fileData = loadedZip.files[filename];
        if (!fileData.dir) {
          // In case someone has a zip with large build artifacts, don't waste time
          if(fileData._data.uncompressedSize > MAX_SOURCE_SIZE) continue;
          const fileContent = await fileData.async("string");
          files[filename] = fileContent;
        }
      }
      setZipContents(files);

      // Loop through again to extract details about any circuits in the zip
      const circuits = [];
      for (const filename of Object.keys(files)) {
        const fileContent = files[filename];
        const circomCircuit = circom.parse(fileContent, filename, files);
        if(circomCircuit) circuits.push(circomCircuit);
      }
      console.log(circuits);
      setCircuits(circuits);

    } catch (error) {
      console.error("Error reading ZIP file", error);
      toast.error("Error reading ZIP file");
    }
  };

  return (
    <div>
      <h2 className={`
        text-xl pt-6 pb-3 mb-8
        border-b border-neutral-300 dark:border-neutral-600
      `}>Verify Circuit</h2>
      <FileDropZone
        acceptFiletype=".zip"
        onFileSelect={handleFileChange}
      />

      <h3 className="text-center p-3 italic">
        {circuits.length === 0 ? 'Select a zip file with circuit sources (Circom or Noir)' :
          circuits.length === 1 ? '1 circuit found' :
          `${circuits.length} circuits found`}
      </h3>
      <ul className="text-center">
        {circuits.map((circuit, index) => (
          <li key={index} className="inline-block align-top">
            <button
              onClick={() => setCircuit(circuit)}
              className={`${clsButton}`}
              disabled={circuit.error}
            >
              {circuit.type === 'circom' && <circom.CircuitName {...{circuit}} />}
            </button>
            {circuit.error && <span class="block text-red-500">{circuit.error}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

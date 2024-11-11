import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import JSZip from "jszip";
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

import AddressHeader from '../components/AddressHeader.js';
import {BuildStatus} from '../components/BuildStatus.js';
import Card from '../components/Card.js';
import * as circom from '../components/CircomCompile.js';
import * as noir from '../components/NoirCompile.js';
import DeployContract from '../components/DeployContract.js';
import FileDropZone from '../components/FileDropZone.js';
import GenerateKey from '../components/GenerateKey.js';
import {clsButton, clsInput, clsIconA} from '../components/Layout.js';
import {PopupDialog} from '../components/PopupDialog.js';
import SubmitContractPopup from '../components/SubmitContractPopup.js';
import useConfirmClose from '../components/useConfirmClose.js';
import useLocalStorageState from '../components/useLocalStorageState.js';
import WalletWrapper from '../components/WalletWrapper.js';
import Wizard from '../components/Wizard.js';
import {watchInstance} from '../utils/server.js';

const MAX_SOURCE_SIZE = 10 * 1024 * 1024; // 10 MB

const PIPELINES = {
  'circom': circom,
  'noir': noir,
};

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

export default function VerifyPage() {
  const navigate = useNavigate();
  const [zipContents, setZipContents] = useState({});
  const [circuit, setCircuit] = useState({});
  const [payload, setPayload] = useState(null);
  const [instanceType, setInstanceType] = useState(() => Object.values(INSTANCE_SIZES)[0]);
  const payloadRef = useRef();
  const [instanceStatus, setInstanceStatus] = useState(null);
  const [apiKey, setApiKey] = useLocalStorageState('cs-apikey', '');
  const inputRef = useRef(null);
  const [requestIdInput, setRequestIdInput] = useState();
  const [requestId, setRequestId] = useState(() => {
    // skip to compiler status if page loads with a request hash
    const hash = window.location.hash.substring(1);
    if(hash && hash.startsWith('req-')) {
      return hash.slice(4);
    }
    return '';
  });
  const [pkgName, setPkgName] = useState(() => {
    // skip to package status if page loads with a pkg name
    const hash = window.location.hash.substring(1);
    if(hash && hash.startsWith('pkg-')) {
      return hash.slice(4);
    }
    return '';
  });
  const [deployment, setDeployment] = useState(null);
  useConfirmClose(!!requestId && !pkgName);

  useEffect(() => {
    window.location.hash = pkgName ? `pkg-${pkgName}` : requestId ? `req-${requestId}` : '';
  }, [requestId, pkgName]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if(hash && hash.startsWith('req-')) {
        setRequestId(hash.slice(4));
        setPkgName('');
      }
      if(hash && hash.startsWith('pkg-')) {
        setPkgName(hash.slice(4));
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  async function handleCompileSubmit(event) {
    event.preventDefault();
    const payload = payloadRef.current.serializeState();
    const requestId = generateRandomString(40);
    setRequestId(requestId);

    const request = {
      apiKey,
      payload: {
        ...payload,
        requestId,
        instanceType,
      },
    };
    const response = await fetch(import.meta.env.VITE_COMPILER_URL, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const body = await response.text();
      toast.error('Network response was not ok: ' + body);
      return;
    }
    const data = await response.json();
    let body = 'body' in data ? JSON.parse(data.body) : data;
    if('errorType' in body) {
      toast.error(body.errorMessage);
      return;
    }

    if(data.status === 'ok') {
      setInstanceStatus('Instance started. Wait a few minutes for initialization...');
      // Other statuses will arrive in the BuildStatus component
      try {
        // TODO do something with stdout, stderr?
        const {stderr, stdout} = await watchInstance(requestId, apiKey, setInstanceStatus, 8000);
        toast.success('Circuit compiled!');
      } catch(error) {
        console.error(error);
        toast.error('Compilation was not successful.');
        return;
      }
    }

  }

  async function verifyCircuit(action, pkgName, chainId, contract) {
    const event = {payload: {action, pkgName, chainId, contract}};
    toast.loading('Verifying circuit...');

    const response = await fetch(import.meta.env.VITE_SERVER_URL, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    if (!response.ok && response.status !== 400) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    const body = 'body' in data ? JSON.parse(data.body) : data;
    toast.dismiss();

    if('errorType' in body) {
      toast.error(`Verification error: ${body.errorMessage}`);
      return;
    }

    if(body && body.status === 'verified') {
      toast.success('Circuit verified!');
      navigate(`/chain/${chainId}/address/${contract}`);
      // TODO why does the page not update only the url in address bar?
      // XXX force refresh
      navigate(0);
    }
  }

  const pipeline = PIPELINES[circuit.type];
  return (<Card>
    <Helmet>
      <title>Circuitscan - Verify Circuit</title>
    </Helmet>
    <Wizard
      currentStep={
        pkgName ? 3 :
        requestId ? 2 :
        !apiKey ? -1 :
        circuit.type ? 1 :
        0
      }
      steps={[
        {
          title: 'Select Circuit',
          children: <>
            <ZipFileUploader {...{setCircuit, zipContents, setZipContents}} />
            <div className="flex flex-col items-center justify-center">
              <PopupDialog
                linkText="Or, resume request ID..."
                onSubmit={(event, hideDialog) => {
                  hideDialog();
                  setRequestId(requestIdInput);
                }}
                {...{inputRef}}
              >
                <p className="dark:text-slate-200">Request ID:</p>
                <input
                  className={`${clsInput} mt-1 mb-4`}
                  onChange={(e) => setRequestIdInput(e.target.value)}
                  value={requestIdInput}
                  ref={inputRef}
                />
              </PopupDialog>
            </div>
          </>,
        },
        {
          title: 'Compiler Options',
          children: <form onSubmit={handleCompileSubmit} className={`
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
                {pipeline && <pipeline.CircuitName {...{circuit}} />}
                &hellip;
              </h2>
              {pipeline && <pipeline.Options {...{circuit, zipContents}} ref={payloadRef} />}
              <label className="block">
                <span>Instance Size:</span>
                <select
                  value={instanceType}
                  onChange={(e) => setInstanceType(e.target.value)}
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
          children: <div className={`
              flex flex-col space-y-4
            `}>
              <button
                onClick={() => setRequestId('')}
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
                Compiling&hellip;
              </h2>
            {instanceStatus && instanceStatus.error ?
              <p className="text-red-500">
                {instanceStatus.msg}
              </p>
             : instanceStatus ?
              <p>
                {instanceStatus}
              </p>
             : null}
            <BuildStatus
              {...{requestId, apiKey}}
              doRefresh={true}
              isCircom={true}
              skipCard={true}
              customError=<></>
              renderOnComplete={(data) => <>
                <div className="flex flex-col p-3">
                  <button
                    className={`${clsButton} self-center`}
                    onClick={() => {
                      for(let i = 0; i < data.raw.length; i++) {
                        if(data.raw[i].msg.startsWith('Compiling ')) {
                          setPkgName(data.raw[i].msg.slice(10, -3));
                          break;
                        }
                      }
                    }}
                  >
                    Compilation Complete: Verify or Deploy
                  </button>
                </div>
              </>}
            />
          </div>
        },
        {
          title: 'Verify or Deploy',
          children: <div className={`
              flex flex-col space-y-4
            `}>
              <button
                onClick={() => setPkgName('')}
                className={`${clsIconA} self-start pt-5`}
                title="Return to previous step..."
                type="button"
              >
                <ArrowLeftIcon className="inline h-9 w-9" />
              </button>
              <h2 className={`
                text-xl pb-3
                border-b border-neutral-300 dark:border-neutral-600
              `}>
                Verify or Deploy&hellip;

              </h2>
              <WalletWrapper>
                <DeployContract {...{pkgName, deployment, setDeployment}} />
              </WalletWrapper>
              <SubmitContractPopup {...{setDeployment}} />
              {deployment && <>
                <div className="flex flex-col p-3 items-center">
                  <AddressHeader
                    className="w-full text-center"
                    address={deployment.contractAddress}
                    data={{[deployment.chainId]: {pkg_name: pkgName, info: {pkgSize: '???'}}}}
                    deployedChain={{id: deployment.chainId}}
                    isAddressOnThisChain={null}
                  />
                  <button
                    className={`${clsButton} self-center`}
                    onClick={() => verifyCircuit('verifyCircom', pkgName, deployment.chainId, deployment.contractAddress)}
                  >
                    Verify Circuit Verifier
                  </button>
                </div>
              </>}
            </div>,
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
        for(let key of Object.keys(PIPELINES)) {
          const circuit = PIPELINES[key].parse(fileContent, filename, files);
          if(circuit) circuits.push(circuit);
        }
      }
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
        {circuits.map((circuit, index) => {
          const pipeline = PIPELINES[circuit.type];
          return (
            <li key={index} className="inline-block align-top">
              <button
                onClick={() => setCircuit(circuit)}
                className={`${clsButton}`}
                disabled={circuit.error}
              >
                <pipeline.CircuitName {...{circuit}} />
              </button>
              {circuit.error && <span class="block text-red-500 p-2">{circuit.error}</span>}
            </li>
          );
        })}
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

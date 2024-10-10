import {useState, useEffect} from 'react';
import {
  createPublicClient,
  http,
  encodeFunctionData,
} from 'viem';
import {
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import {clsButton, clsInput, clsIconA} from './Layout.js';
import {
  findChain,
  getImports,
  loadListOrFile,
  formatBytes,
} from '../utils.js';

async function noirLoader(version) {
  // Vite won't pick up dynamic import names
  let noir, bb;
  switch(version) {
    case '0.31.0':
      noir = import('noir_js-v0.31.0');
      bb = import('barretenberg-v0.31.0');
      break;
    case '0.32.0':
      noir = import('noir_js-v0.32.0');
      bb = import('barretenberg-v0.32.0');
      break;
    case '0.33.0':
      noir = import('noir_js-v0.33.0');
      bb = import('barretenberg-v0.33.0');
      break;
    case '0.34.0':
      noir = import('noir_js-v0.34.0');
      bb = import('barretenberg-v0.34.0');
      break;
  }
  if(!noir) throw new Error('Noir v0.31.0 - v0.34.0 only!');
  return { noir: await noir, bb: await bb };
}

export function NoirProofMaker({ info, pkgName, chainParam, address, mainArgs }) {
  const [proofOutput, setProofOutput] = useState();
  const [proofInputs, setProofInputs] = useState('{}');
  const [pkeySize, setPkeySize] = useState(null);
  const [pkeyData, setPkeyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress1, setProgress1] = useState([0,0]);
  const [error, setError] = useState(null);

  const deployedChain = findChain(chainParam);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        setProofInputs(JSON.stringify(mainArgs.reduce((out, cur) => {
          out[cur.name] = 1;
          return out;
        }, {}), null, 2));
        const mainPkgList = await loadListOrFile(`build/${pkgName}/pkg.zip`);
        setPkeySize({
          size: mainPkgList.filter(x =>
            x.fileName === `target/${info.nargoToml.package.name}.json`
          ).reduce((out, cur) => out + cur.compressedSize, 0),
        });
      } catch (error) {
        console.error(error);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, [info, pkgName]);

  async function downloadPkey() {
    try {
      const noirImports = await noirLoader(info.nargoVersion);

      const circuitPromise = loadListOrFile(`build/${pkgName}/pkg.zip`,
        `target/${info.nargoToml.package.name}.json`, false, setProgress1);
      const circuit = await circuitPromise;

      setPkeyData({ circuit, ...noirImports });
    } catch(error) {
      console.error(error);
      toast.error(err);
    }
  }

  async function prove() {
    if(!pkeyData) {
      toast.dismiss();
      toast.error('No pkey loaded.');
      return;
    }
    let inputs, proof;
    try {
      inputs = JSON.parse(proofInputs);
    } catch(error) {
      toast.error(error.message);
      return;
    }
    toast.dismiss();
    toast.loading('Generating proof...');
    try {
      const circuit = JSON.parse(pkeyData.circuit);
      const noir = new pkeyData.noir.Noir(circuit);
      const witness = await noir.execute(inputs);
      const bb = new pkeyData.bb.BarretenbergBackend(circuit);
      proof = await bb.generateProof(witness.witness);
      proof.proofHex = '0x' + uint8ArrayToHexString(proof.proof);
      setProofOutput(proof);
    } catch(error) {
      console.error(error);
      toast.dismiss();
      toast.error(error.message);
      return;
    }


    const publicClient = createPublicClient({
      chain: deployedChain,
      transport: http(),
    });

    const funcData = encodeFunctionData({
      abi: verifierABI,
      functionName: 'verify',
      args: [proof.proofHex, proof.publicInputs],
    });

    const callResult = await publicClient.call({
      data: funcData,
      to: address,
    });
    const success = parseInt(callResult.data) > 0;
    if(!success) {
      toast.dismiss();
      toast.error('Proof inputs failed to verify');
      return;
    }
    toast.dismiss();
    toast.success('Proof verified successfully!');

  }
  return (<>
    {loading ? <>
      Loading proof input template...
    </> : error ? <>
      Error loading!
    </> : <>
      <p className="text-l font-bold pb-1">
        Proof Input Signals
        &nbsp;<a
          href={`https://circuitscan.readthedocs.io/en/latest/build-artifacts-noir.html#in-browser-proof-generator`}
          target="_blank"
          rel="noopener"
          className={`${clsIconA}`}
          title="View proof generator documentation..."
        >
          <QuestionMarkCircleIcon className="inline h-5 w-5" />
        </a>
      </p>
      <textarea
        className={`${clsInput} min-h-32`}
        onChange={(e) => setProofInputs(e.target.value)}
        value={proofInputs}
      />
      <div className="flex flex-col">
        <button
          disabled={pkeyData || progress1[1] > 0}
          className={`
            ${clsButton}
            mt-3
          `}
          onClick={downloadPkey}
        >
          Download Proving Key&nbsp;
          <span className="whitespace-nowrap inline-block">
            ({formatBytes(pkeySize.size)})
          </span>
        </button>
        <progress
          className="rounded-md w-full h-4 bg-gray-200 dark:bg-gray-800"
          value={progress1[0]}
          max={progress1[1]}
          />
        <button
          disabled={!pkeyData}
          className={`
            ${clsButton}
            mt-3
          `}
          onClick={prove}
        >Generate Proof</button>
      </div>
      {proofOutput && <>
        <p className="text-l font-bold">
          Proof
        </p>
        <textarea
          className={`${clsInput} min-h-32`}
          value={proofOutput.proofHex}
          readOnly
        />
        <p className="text-l font-bold">Public Inputs</p>
        <textarea
          className={`${clsInput} min-h-32`}
          value={JSON.stringify(proofOutput.publicInputs, null, 2)}
          readOnly
        />
      </>}
    </>}
  </>);
}

function uint8ArrayToHexString(uint8Array) {
  return Array.from(uint8Array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

const verifierABI = [{"inputs":[],"name":"INVALID_VERIFICATION_KEY","type":"error"},{"inputs":[],"name":"MOD_EXP_FAILURE","type":"error"},{"inputs":[],"name":"OPENING_COMMITMENT_FAILED","type":"error"},{"inputs":[],"name":"PAIRING_FAILED","type":"error"},{"inputs":[],"name":"PAIRING_PREAMBLE_FAILED","type":"error"},{"inputs":[],"name":"POINT_NOT_ON_CURVE","type":"error"},{"inputs":[{"internalType":"uint256","name":"expected","type":"uint256"},{"internalType":"uint256","name":"actual","type":"uint256"}],"name":"PUBLIC_INPUT_COUNT_INVALID","type":"error"},{"inputs":[],"name":"PUBLIC_INPUT_GE_P","type":"error"},{"inputs":[],"name":"PUBLIC_INPUT_INVALID_BN128_G1_POINT","type":"error"},{"inputs":[],"name":"getVerificationKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes","name":"_proof","type":"bytes"},{"internalType":"bytes32[]","name":"_publicInputs","type":"bytes32[]"}],"name":"verify","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];




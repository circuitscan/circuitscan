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
  verifierABI,
  inputTemplate,
  loadListOrFile,
  formatBytes,
} from '../utils.js';

// Disable proof maker above this size (1gb)
const MAX_SIZE = 1000000000;

function snarkjsLoader(version) {
  // Vite won't pick up dynamic import names
  switch(version) {
    // XXX These earlier versions cause a vite build failure
    // case '0.6.11': return import('snarkjs-v0.6.11');
    // case '0.7.0': return import('snarkjs-v0.7.0');
    // case '0.7.1': return import('snarkjs-v0.7.1');
    case '0.7.2': return import('snarkjs-v0.7.2');
    case '0.7.3': return import('snarkjs-v0.7.3');
    case '0.7.4': return import('snarkjs-v0.7.4');
    case '0.7.5': return import('snarkjs-v0.7.5');
  }
  throw new Error('SnarkJS v0.7.2 - v0.7.5 only!');
}

export function ProofMaker({ info, pkgName, chainParam, address, template }) {
  const [proofOutput, setProofOutput] = useState();
  const [proofInputs, setProofInputs] = useState('{}');
  const [pkeySize, setPkeySize] = useState(null);
  const [pkeyData, setPkeyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress1, setProgress1] = useState([0,0]);
  const [progress2, setProgress2] = useState([0,0]);
  const [error, setError] = useState(null);

  const deployedChain = findChain(chainParam);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        setProofInputs(JSON.stringify(inputTemplate(
          template,
          info.circuit.params,
        ), null, 2));
        if(info.pkgSize < MAX_SIZE) {
          const mainPkgList = await loadListOrFile(`build/${pkgName}/pkg.zip`);
          setPkeySize({
            size: mainPkgList.filter(x =>
              x.fileName === `build/verify_circuit/${info.protocol}_pkey.zkey` ||
              x.fileName === `build/verify_circuit/verify_circuit_js/verify_circuit.wasm`
            ).reduce((out, cur) => out + cur.compressedSize, 0),
          });
        } else {
          setPkeySize({ size: info.pkgSize });
        }
      } catch (error) {
        console.error(error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, [info, pkgName]);

  async function downloadPkey() {
    try {
      // Load snarkjs first to ensure it's a compatible version
      const snarkjs = await snarkjsLoader(info.snarkjsVersion);
      // Load simultaneously
      const finalZkeyPromise = loadListOrFile(`build/${pkgName}/pkg.zip`,
        `build/verify_circuit/${info.protocol}_pkey.zkey`, true, setProgress1);
      const wasmPromise = loadListOrFile(`build/${pkgName}/pkg.zip`,
        `build/verify_circuit/verify_circuit_js/verify_circuit.wasm`, true, setProgress2);
      const finalZkey = await finalZkeyPromise;
      const wasm = await wasmPromise;

      setPkeyData({ finalZkey, wasm, snarkjs });
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  }

  async function prove() {
    if(!pkeyData) {
      toast.dismiss();
      toast.error('No pkey loaded.');
      return;
    }
    let inputs;
    try {
      inputs = JSON.parse(proofInputs);
    } catch(error) {
      toast.error(error.message);
      return;
    }
    toast.dismiss();
    toast.loading('Generating proof...');
    let proof;
    try {
      // XXX: snarkjs fullProve fails on wasm from circom 2.2.0?
      // This witness calculator is from a build by circom 2.2.0
      // and works on circuits compiled with earlier versions
      const wc = (await import('../utils/witness_calculator.js')).default;
      const witnessCalculator = await wc(pkeyData.wasm);
      const witness = await witnessCalculator.calculateWTNSBin(inputs, 0);
      proof = await pkeyData.snarkjs[info.protocol].prove(pkeyData.finalZkey, witness, console);
    } catch(error) {
      console.error(error);
      toast.dismiss();
      toast.error(error.message);
      return;
    }

    const calldata = JSON.parse('[' +
      getCalldata(proof.proof, info.protocol)
      + ',' +
      publicSignalsCalldata(proof.publicSignals)
      + ']');
    setProofOutput({calldata, proof});

    const publicClient = createPublicClient({
      chain: deployedChain,
      transport: http(),
    });

    const funcData = encodeFunctionData({
      abi: verifierABI(info.protocol, proof.publicSignals.length),
      functionName: 'verifyProof',
      args: calldata,
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
          href={`https://circuitscan.readthedocs.io/en/latest/build-artifacts-circom.html#in-browser-proof-generator`}
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
          disabled={pkeyData || progress1[1] > 0 || info.pkgSize > MAX_SIZE}
          className={`
            ${clsButton}
            mt-3
          `}
          onClick={downloadPkey}
        >
          {info.pkgSize > MAX_SIZE
            ? 'Circuit too large! '
            : 'Download Final ZKey and WASM '
          }
          <span className="whitespace-nowrap inline-block">
            ({formatBytes(pkeySize.size)})
          </span>
        </button>
        <progress
          className="rounded-md w-full h-4 bg-gray-200 dark:bg-gray-800"
          value={progress1[0] + progress2[0]}
          max={progress1[1] + progress2[1]}
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
          verifyProof calldata
        </p>
        <textarea
          className={`${clsInput} min-h-32`}
          value={JSON.stringify(proofOutput.calldata, null, 2)}
          readOnly
        />
        <p className="text-l font-bold">Public Signals</p>
        <textarea
          className={`${clsInput} min-h-32`}
          value={JSON.stringify(proofOutput.proof.publicSignals, null, 2)}
          readOnly
        />
      </>}
    </>}
  </>);
}

// The following is adapted from circomkit/src/utils/calldata.ts
/** Makes each value 32-bytes long hexadecimal. Does not check for overflows! */
function valuesToPaddedUint256s(vals) {
  return vals.map(val => '0x' + BigInt(val).toString(16).padStart(64, '0'));
}

/** Wraps a string with double quotes. */
function withQuotes(vals) {
  return vals.map(val => `"${val}"`);
}

function publicSignalsCalldata(pubs) {
  const pubs256 = valuesToPaddedUint256s(pubs);
  return `[${pubs256.map(s => `"${s}"`).join(',')}]`;
}


function getCalldata(proof, protocol) {
  switch (protocol) {
    case 'groth16':
      return groth16Calldata(proof);
    case 'plonk':
      return plonkCalldata(proof);
    case 'fflonk':
      return fflonkCalldata(proof);
    default:
      throw 'Unknown protocol:' + protocol;
  }
}

function fflonkCalldata(proof) {
  const vals = valuesToPaddedUint256s([
    proof.polynomials.C1[0], proof.polynomials.C1[1],
    proof.polynomials.C2[0], proof.polynomials.C2[1],
    proof.polynomials.W1[0], proof.polynomials.W1[1],
    proof.polynomials.W2[0], proof.polynomials.W2[1],
    proof.evaluations.ql, proof.evaluations.qr, proof.evaluations.qm,
    proof.evaluations.qo, proof.evaluations.qc,
    proof.evaluations.s1, proof.evaluations.s2, proof.evaluations.s3,
    proof.evaluations.a, proof.evaluations.b, proof.evaluations.c,
    proof.evaluations.z, proof.evaluations.zw,
    proof.evaluations.t1w, proof.evaluations.t2w,
    proof.evaluations.inv,
  ]);

  return `[${withQuotes(vals).join(',')}]`;
}

function plonkCalldata(proof) {
  const vals = valuesToPaddedUint256s([
    proof.A[0], proof.A[1], proof.B[0], proof.B[1], proof.C[0], proof.C[1],
    proof.Z[0], proof.Z[1],
    proof.T1[0], proof.T1[1], proof.T2[0], proof.T2[1], proof.T3[0], proof.T3[1],
    proof.Wxi[0], proof.Wxi[1],
    proof.Wxiw[0], proof.Wxiw[1],
    proof.eval_a, proof.eval_b, proof.eval_c,
    proof.eval_s1, proof.eval_s2,
    proof.eval_zw,
  ]);

  return `[${withQuotes(vals).join(',')}]`;
}

function groth16Calldata(proof) {
  const pA = valuesToPaddedUint256s([proof.pi_a[0], proof.pi_a[1]]);
  const pC = valuesToPaddedUint256s([proof.pi_c[0], proof.pi_c[1]]);

  // note that pB are reversed, notice the indexing is [1] and [0] instead of [0] and [1].
  const pB0 = valuesToPaddedUint256s([proof.pi_b[0][1], proof.pi_b[0][0]]);
  const pB1 = valuesToPaddedUint256s([proof.pi_b[1][1], proof.pi_b[1][0]]);

  return [
    `[${withQuotes(pA).join(', ')}]`,
    `[[${withQuotes(pB0).join(', ')}], [${withQuotes(pB1).join(', ')}]]`,
    `[${withQuotes(pC).join(', ')}]`,
  ].join(',');
}

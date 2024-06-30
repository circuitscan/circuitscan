import {useState, useEffect} from 'react';
import {
  createPublicClient,
  http,
  encodeFunctionData,
} from 'viem';
import { toast } from 'react-hot-toast';
// TODO support multiple version of snarkjs
import * as snarkjs from 'snarkjs';

import {clsButton, clsInput} from './Layout.js';
import {
  findChain,
  verifierABI,
  joinPaths,
  getImports,
  extractCircomTemplate,
  inputTemplate,
  loadListOrFile,
  formatBytes,
} from '../utils.js';

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
        const mainPkgList = await loadListOrFile(`build/${pkgName}/pkg.zip`);
        setPkeySize({
          size: mainPkgList.filter(x =>
            x.fileName === `build/verify_circuit/${info.protocol}_pkey.zkey` ||
            x.fileName === `build/verify_circuit/verify_circuit_js/verify_circuit.wasm`
          ).reduce((out, cur) => out + cur.compressedSize, 0),
        });
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, []);

  async function downloadPkey() {
    // Load simultaneously
    const finalZkeyPromise = loadListOrFile(`build/${pkgName}/pkg.zip`,
      `build/verify_circuit/${info.protocol}_pkey.zkey`, true, setProgress1);
    const wasmPromise = loadListOrFile(`build/${pkgName}/pkg.zip`,
      `build/verify_circuit/verify_circuit_js/verify_circuit.wasm`, true, setProgress2);
    const finalZkey = await finalZkeyPromise;
    const wasm = await wasmPromise;

    setPkeyData({ finalZkey, wasm });
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
      proof = await snarkjs[info.protocol].fullProve(inputs, pkeyData.wasm, pkeyData.finalZkey);
    } catch(error) {
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
      <p className="text-l font-bold">Proof Input Signals</p>
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
          Download Final ZKey and WASM&nbsp;
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


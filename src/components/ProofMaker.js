import {useState, useEffect} from 'react';
import {
  createPublicClient,
  http,
  encodeFunctionData,
} from 'viem';
import { toast } from 'react-hot-toast';

import {loadFileList} from './SourceTree.js';
import {clsButton, clsInput} from './Layout.js';
import {
  findChain,
  verifierABI,
  joinPaths,
  getImports,
  extractCircomTemplate,
  inputTemplate,
} from '../utils.js';

export function ProofMaker({ info, pkgName }) {
  const [proofInputs, setProofInputs] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        // Find the template in the sources somewhere
        let tryFiles = [ info.circuit.file + '.circom' ];
        let source, template, i = 0;
        while(!template) {
          const tryFile = tryFiles[i++];
          if(!tryFile) throw new Error('Template not found!');
          source = await loadFileList(pkgName, tryFile);
          template = extractCircomTemplate(source, info.circuit.template);
          if(!template) {
            const imports = getImports(source).map(path => joinPaths(tryFile, path));
            tryFiles = [ ...tryFiles, ...imports ];
          }
        }
        setProofInputs(JSON.stringify(inputTemplate(
          template,
          info.circuit.params,
        ), null, 2));
      } catch (err) {
        console.error(error);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, []);

  // TODO generate proofs on the client
  async function prove() {
    // TODO download proving key
    // TODO generate proof using snarkjs
    let inputs;
    try {
      inputs = JSON.parse(proofInputs);
    } catch(error) {
      toast.error(error.message);
      return;
    }
    toast.dismiss();
    toast.loading('Generating proof...');
    const protocol = parsedData.verified.payload.protocol;
    const resultProve = await post(import.meta.env.VITE_API_URL_CIRCOM, { payload: {
      action: 'prove',
      circuitHash: parsedData.verified.circuitHash,
      protocol,
      input: inputs,
    }});
    // Difference between local Docker/AWS deployed
    const result = 'body' in resultProve ? JSON.parse(resultProve.body) : resultProve;
    if('errorType' in result) {
      toast.dismiss();
      toast.error(result.errorMessage);
      return;
    }
    const calldata = JSON.parse(result.calldata);

    const publicClient = createPublicClient({
      chain: deployedChain,
      transport: http(),
    });

    const funcData = encodeFunctionData({
      abi: verifierABI(protocol, result.proof.publicSignals.length),
      functionName: 'verifyProof',
      args: calldata,
    });

    const callResult = await publicClient.call({
      data: funcData,
      to: address,
    });
    setProofOutput(result);
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
      Loading...
    </> : error ? <>
      Error loading!
    </> : <>
      <p className="text-l font-bold">Proof Input Signals</p>
      <textarea
        className={`${clsInput} min-h-32`}
        onChange={(e) => setProofInputs(e.target.value)}
        value={proofInputs}
      />
      {/*
      <button
        className={`
          ${clsButton}
          mt-3
        `}
        onClick={prove}
      >Generate Proof</button>
      {proofOutput && <>
        <p className="text-l font-bold">
          verifyProof calldata
        </p>
        <textarea
          className={`${clsInput} min-h-32`}
          value={JSON.stringify(JSON.parse(proofOutput.calldata), null, 2)}
          readOnly
        />
        <p className="text-l font-bold">Public Signals</p>
        <textarea
          className={`${clsInput} min-h-32`}
          value={JSON.stringify(proofOutput.proof.publicSignals, null, 2)}
          readOnly
        />
      </>}
      */}
    </>}
  </>);
}

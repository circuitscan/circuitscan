import {readFileSync, writeFileSync, mkdtempSync, rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as snarkjs from 'snarkjs';

export async function fullProve(input, protocol, wasm, pkey) {
  if(!protocol || !(protocol in snarkjs))
    throw new Error('invalid_protocol');

  const dirProvers = mkdtempSync(join(tmpdir(), 'provers-'));
  const wasmPath = join(dirProvers, 'prover.wasm');
  const pkeyPath = join(dirProvers, 'pkey.zkey');
  writeFileSync(wasmPath, wasm);
  writeFileSync(pkeyPath, pkey);

  const proof = await snarkjs[protocol].fullProve(
    input,
    wasmPath,
    pkeyPath,
  );

  const calldata =
    '[' +
    getCalldata(proof.proof, protocol)
    + ',' +
    publicSignalsCalldata(proof.publicSignals)
    + ']';

  return {
    proof,
    calldata,
  };
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

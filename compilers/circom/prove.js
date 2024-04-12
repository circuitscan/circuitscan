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
  console.log(wasmPath);
  console.log(pkeyPath);
  console.log(wasm);
  console.log(pkey);

  const proof = await snarkjs[protocol].fullProve(
    input,
    wasmPath,
    pkeyPath,
  );

  const calldata = await snarkjs[protocol].exportSolidityCallData(
    proof.proof,
    proof.publicSignals
  );

  return {
    proof,
    calldata,
  };
}

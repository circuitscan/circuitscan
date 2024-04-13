import * as chains from 'viem/chains';
import { toast } from 'react-hot-toast';


export function findChain(chainId) {
  for(let chain of Object.keys(chains)) {
    if(Number(chainId) === chains[chain].id) return chains[chain];
  }
}


export async function setClipboard(text) {
  if (!navigator.clipboard) {
    toast.error('Clipboard API is not available in this browser.');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  } catch (err) {
    toast.error('Failed to copy to clipboard');
  }
}

export function verifierABI(protocol, pubCount) {
  if(protocol === 'fflonk') {
    return [{"inputs":[{"internalType":"bytes32[24]","name":"proof","type":"bytes32[24]"},{"internalType":`uint256[${pubCount}]`,"name":"pubSignals","type":`uint256[${pubCount}]`}],"name":"verifyProof","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];
  } else if(protocol === 'plonk') {
    return [{"inputs":[{"internalType":"uint256[24]","name":"_proof","type":"uint256[24]"},{"internalType":`uint256[${pubCount}]`,"name":"_pubSignals","type":`uint256[${pubCount}]`}],"name":"verifyProof","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]
  } else if(protocol === 'groth16') {
    return [{"inputs":[{"internalType":"uint256[2]","name":"_pA","type":"uint256[2]"},{"internalType":"uint256[2][2]","name":"_pB","type":"uint256[2][2]"},{"internalType":"uint256[2]","name":"_pC","type":"uint256[2]"},{"internalType":`uint256[${pubCount}]`,"name":"_pubSignals","type":`uint256[${pubCount}]`}],"name":"verifyProof","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]
  }
}

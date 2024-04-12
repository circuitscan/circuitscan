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

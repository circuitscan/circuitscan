import {diffTrimmedLines} from 'diff';
import verifiedSource from 'verified-solidity-source';

import {saveAssoc} from './utils.js';

const HARDHAT_IMPORT = 'import "hardhat/console.sol";';
const CONTRACT_DEF_REGEX = /^contract [a-zA-Z0-9_]+\s*{?\n$/;
const PRAGMA_REGEX = /^pragma solidity \S+;\n$/g

export async function verifyCircom(event) {
  if(isNaN(event.payload.chainId))
    throw new Error('invalid_chainId');
  if(!event.payload.contract)
    throw new Error('missing_contract');
  if(!event.payload.pkgName)
    throw new Error('missing_pkgName');

  // Load etherscan/sourcify verified contract
  const verified = await verifiedSource(event.payload.contract, event.payload.chainId);
  if(!verified)
    throw new Error('contract_not_verified');

  // Load contract from s3
  const compiled = await compiledSource(event.payload.pkgName);

  // Compare differences
  let foundMatch = false;
  // If any of the source files match this verifier, it's good
  // e.g. zkp2p venmo send processor
  // https://sepolia.etherscan.io/address/0x8644C2B4293923BF60c909171F089f4c5F75474c
  for(let source of Object.values(verified)) {
    if(acceptableDiff(source.content, compiled)) {
      foundMatch = true;
      break;
    }
  }
  if(!foundMatch) {
    console.log(verified);
    console.log(compiled);
    throw new Error('invalid_diff');
  }

  await saveAssoc(event.payload.contract, event.payload.chainId, event.payload.pkgName);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'verified',
    }),
  };
}

async function compiledSource(pkgName) {
  const resp = await fetch(process.env.BLOB_URL + 'build/' + pkgName + '/verifier.sol');
  return resp.text();
}

async function pkgInfoJson(pkgName) {
  const resp = await fetch(process.env.BLOB_URL + 'build/' + pkgName + '/info.json');
  return resp.text();
}

function removeComments(value) {
  return value.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
}

export function acceptableDiff(sourceA, sourceB) {
  const diff = diffTrimmedLines(
    // Allow comment differences
    removeComments(sourceA),
    removeComments(sourceB),
    { stripTrailingCr: true, }
  );

  let lastRemoved = null;
  for(let i = 0; i < diff.length; i++) {
    if(diff[i].removed) {
      if(lastRemoved !== null) {
        // Changes acceptableDiff below
        console.log('removed_after_another_removal', i);
        return false;
      }
      if(diff[i].value.trim() !== '') {
        lastRemoved = i;
      }
    } else if(lastRemoved === null
      && diff[i].added
      // Added whitespace is fine
      && diff[i].value.trim() !== ''
      // XXX: plonk output has an errant hardhat debug include?
      // Accept the verified source if this is removed
      && diff[i].value.trim() !== HARDHAT_IMPORT
    ) {
      // Otherise, anything else added is invalid
      console.log('invalid_addition', i);
      return false;
    } else if(lastRemoved === i - 1 && diff[i].added) {
      lastRemoved = null;
      // Allow only whitespace differences
      if(diff[i-1].value.trim() !== diff[i].value.trim()
        // allow for contract name changes
        && !(diff[i-1].value.match(CONTRACT_DEF_REGEX)
          && diff[i].value.match(CONTRACT_DEF_REGEX))
        // allow pragma solidity differences
        && !(diff[i-1].value.match(PRAGMA_REGEX)
          && diff[i].value.match(PRAGMA_REGEX))
      ) {
        console.log('invalid_change', i);
        return false;
      }
    } else if(lastRemoved !== null && diff[i].added) {
      console.log('invalid_removal', i);
      return false;
    }
  }
  if(lastRemoved !== null) {
    console.log('invalid_unbalanced_removal', lastRemoved)
    return false;
  }
  return true;
}

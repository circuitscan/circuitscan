import {diffTrimmedLines} from 'diff';
import verifiedSource from 'verified-solidity-source';
import {mergeVerifiers} from 'snarkjs-groth16-multi-verifier';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import {isAddress} from 'viem';

import {saveAssoc, transformS3Json} from './utils.js';
import modifiers from './modifiers/index.js';

const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

const CONTRACT_DEF_REGEX = /^contract [a-zA-Z0-9_]+\s*{?\n$/;
const PRAGMA_REGEX = /^pragma solidity \S+;\n$/g

export async function verifyCircomMulti(event, options) {
  options = options || {};

  if(('modifier' in event.payload) && !(event.payload.modifier in modifiers))
    throw new Error('invalid_modifier');
  if(!('verifiers' in event.payload) || !(event.payload.verifiers instanceof Array))
    throw new Error('invalid_verifiers');
  for(let verifier of event.payload.verifiers) assertAddrChainObj(verifier);
  if(isNaN(event.payload.offset))
    throw new Error('invalid_offset');
  if(!('deployed' in event.payload))
    throw new Error('invalid_deployed');
  assertAddrChainObj(event.payload.deployed);

  const sources = [];
  // No Promise.all in order to not get rate limited
  for(let verifier of event.payload.verifiers) {
    const source = await verifiedSource(verifier.address, verifier.chainId);
    if(!source)
      throw new Error('contract_not_verified');
    sources.push(source[Object.keys(source)[0]].content);
    await delay(100);
  }
  let mergedSol = mergeVerifiers(sources, event.payload.offset);
  if(event.payload.modifier) {
    mergedSol = modifiers[event.payload.modifier](mergedSol);
  }
  const deployed = await verifiedSource(event.payload.deployed.address, event.payload.deployed.chainId);
  if(!deployed)
    throw new Error('contract_not_verified');

  let foundMatch = false;
  for(let source of Object.values(deployed)) {
    if(acceptableDiff(source.content, mergedSol)) {
      foundMatch = true;
      break;
    }
  }

  if(!foundMatch) {
    throw new Error('invalid_diff');
  }

  if(!options.skipSave) {
    const pkgName = `groth16multi-${uniqueNamesGenerator({
      dictionaries: [adjectives, colors, animals],
      separator: '-',
    })}`;
    await transformS3Json(process.env.ASSOC_BUCKET, `build/${pkgName}/info.json`, data => {
      data.type = 'groth16multi';
      data.payload = event.payload;
      return data;
    });
    await saveAssoc(event.payload.deployed.address, event.payload.deployed.chainId, pkgName);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'verified',
    }),
  };
}

function assertAddrChainObj(obj) {
  if(!isAddress(obj.address))
    throw new Error('invalid_address');
  if(isNaN(obj.chainId))
    throw new Error('invalid_chainId');
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

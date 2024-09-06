import {diffTrimmedLines} from 'diff';
import verifiedSource from 'verified-solidity-source';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import {transformS3Json} from './utils.js';

// TODO allow pragma solidity difference
// TODO allow comment differences
// TODO allow multi-verifiers
const HARDHAT_IMPORT = 'import "hardhat/console.sol";';
const CONTRACT_DEF_REGEX = /^contract [a-zA-Z0-9_]+ {\n$/;
const GROTH16_ENTROPY_REGEX = /^uint256 constant deltax1 = \d+;\nuint256 constant deltax2 = \d+;\nuint256 constant deltay1 = \d+;\nuint256 constant deltay2 = \d+;\n$/;

const s3Client = new S3Client();

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

  // save pkgName association in s3 blob/assoc/<address>.json {[chainid]: "<pkgname>"}
  await transformS3Json(process.env.ASSOC_BUCKET, `assoc/${event.payload.contract}.json`, data => {
    if(event.payload.chainId in data)
      throw new Error('already_verified');
    data[event.payload.chainId] = event.payload.pkgName;
    return data;
  });

  // maintain list of newest n verifiers
  // make a new file that is then aggregated by a separate lambda on a timer
  // into latest.json so that multiple verifications can occur simultaneously
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.ASSOC_BUCKET,
    Key:`latest-queue/${event.payload.chainId}-${event.payload.contract}.json`,
    ContentType: 'application/json',
    Body: JSON.stringify({
      chain: event.payload.chainId,
      address: event.payload.contract,
      pkgName: event.payload.pkgName,
      createdAt: Math.floor(Date.now() / 1000),
    }),
  }));

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

function acceptableDiff(sourceA, sourceB) {
  const diff = diffTrimmedLines(sourceA, sourceB, {
    stripTrailingCr: true,
  });

  let lastRemoved = null;
  for(let i = 0; i < diff.length; i++) {
    if(diff[i].removed) {
      if(lastRemoved !== null) {
        // Changes acceptableDiff below
        console.log('removed_after_another_removal', i);
        return false;
      }
      lastRemoved = i;
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
        // allow for contract name changes?
        && !(diff[i-1].value.match(CONTRACT_DEF_REGEX)
          && diff[i].value.match(CONTRACT_DEF_REGEX))
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

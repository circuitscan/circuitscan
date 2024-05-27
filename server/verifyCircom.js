import pg from 'pg';
import {diffTrimmedLines} from 'diff';

import {findChain} from './chains.js';
import {TABLE_PKG_ASSOC} from './constants.js';

const HARDHAT_IMPORT = 'import "hardhat/console.sol";';
const CONTRACT_DEF_REGEX = /^contract [a-zA-Z0-9_]+ {$/;
const GROTH16_ENTROPY_REGEX = /^uint256 constant deltax1 = \d+;\nuint256 constant deltax2 = \d+;\nuint256 constant deltay1 = \d+;\nuint256 constant deltay2 = \d+;\n$/;

const pool = new pg.Pool({
  connectionString: process.env.PG_CONNECTION,
});

export async function verifyCircom(event) {
  if(!event.payload.chainId)
    throw new Error('missing_chainId');
  const chain = findChain(event.payload.chainId);
  if(!chain)
    throw new Error('invalid_chainId');
  if(!event.payload.contract)
    throw new Error('missing_contract');
  if(!event.payload.pkgName)
    throw new Error('missing_pkgName');

  // Load etherscan verified contract
  const verified = await etherscanSource(chain, event.payload.contract);
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
    if(acceptableDiff(source, compiled)) {
      foundMatch = true;
      break;
    }
  }
  if(!foundMatch)
    throw new Error('invalid_diff');

  // save pkgName association for chainid/address to pg db
  await pool.query(`
    INSERT INTO ${TABLE_PKG_ASSOC}
      (chainid, address, pkg_name, info)
      VALUES ($1, $2, $3, $4)`,
    [
      chain.chain.id,
      Buffer.from(event.payload.contract.slice(2), 'hex'),
      event.payload.pkgName,
      await pkgInfoJson(event.payload.pkgName),
    ]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'verified',
    }),
  };
}

async function compiledSource(pkgName) {
  const resp = await fetch(process.env.BLOB_URL + pkgName + '/verifier.sol');
  return resp.text();
}

async function pkgInfoJson(pkgName) {
  const resp = await fetch(process.env.BLOB_URL + pkgName + '/info.json');
  return resp.text();
}

async function etherscanSource(chain, address) {
  const resp = await fetch(
    chain.apiUrl +
    '?module=contract' +
    '&action=getsourcecode' +
    '&address=' + address +
    '&apikey=' + chain.apiKey
  );
  const data = await resp.json();
  if(!data.result[0].SourceCode) return null;

  let sources;
  let code = data.result[0].SourceCode;
  // Some Etherscans have double curlies, some don't?
  if(code.indexOf('{{') === 0) {
    code = code.slice(1, -1);
  }
  if(code.indexOf('{') === 0) {
    // Etherscan provided an object with multiple solidity sources
    const inner = JSON.parse(code);
    sources = Object.keys(inner.sources).reduce((out, file) => {
      out[file] = inner.sources[file].content;
      return out;
    }, {});
  } else {
    // Some Etherscans send just a string if it's one file
    sources = { 'verifier.sol': code };
  }
  return sources;
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
        // TODO allow for contract name changes?
//         && !(diff[i-1].value.match(CONTRACT_DEF_REGEX)
//           && diff[i].value.match(CONTRACT_DEF_REGEX))
        && !(diff[i-1].value.match(GROTH16_ENTROPY_REGEX)
          && diff[i].value.match(GROTH16_ENTROPY_REGEX))
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

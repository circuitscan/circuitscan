import {diffTrimmedLines} from 'diff';
import pg from 'pg';
import {isAddress, keccak256, toHex} from 'viem';
import {holesky, sepolia} from 'viem/chains';
import {recoverMessageAddress} from 'viem/utils';
import { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan.js";

import {
  standardJson,
  findContractName,
} from './etherscan.js';

const SOLC_VERSION = "v0.8.25+commit.b61c2a91";
const HARDHAT_IMPORT = 'import "hardhat/console.sol";';
const CONTRACT_DEF_REGEX = /^contract [a-zA-Z0-9_]+ {$/;
const GROTH16_ENTROPY_REGEX = /^uint256 constant deltax1 = \d+;\nuint256 constant deltax2 = \d+;\nuint256 constant deltay1 = \d+;\nuint256 constant deltay2 = \d+;\n$/;

const pool = new pg.Pool({
  connectionString: process.env.PG_CONNECTION,
});
const TABLE_SOURCES = 'solidity_sources';
const TABLE_VERIFIED = 'verified_circuit';

const chains = [
  {
    chain: holesky,
    apiUrl: 'https://api-holesky.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  {
    chain: sepolia,
    apiUrl: 'https://api-sepolia.etherscan.io/api',
    apiKey: process.env.ETHERSCAN_API_KEY
  },
];

export async function handler(event) {
  if('body' in event) {
    // Running on AWS
    event = JSON.parse(event.body);
  }
  switch(event.payload.action) {
    case 'newest':
      return getNewest(event);
    case 'get-status':
      return getStatus(event);
    case 'verify':
      return verify(event);
    case 'verify-contract':
      return verifyContract(event);
    case 'check-verify-contract':
      return checkVerification(event);
    default:
      throw new Error('invalid_command');
  }
}

async function getNewest(event) {
  if(isNaN(event.payload.offset) || event.payload.offset < 0)
    throw new Error('invalid_offset');
  if(isNaN(event.payload.limit)
      || event.payload.limit < 0
      || event.payload.limit > 1000)
    throw new Error('invalid_limit');

  let query;
  try {
    query = await pool.query(`
      SELECT
        chainid,
        address,
        created_at,
        payload->'payload'->'tpl' as tpl,
        payload->'payload'->'params' as params,
        payload->'payload'->'protocol' as protocol
      FROM ${TABLE_VERIFIED}
      ORDER BY id DESC
      LIMIT ${Math.floor(event.payload.limit)}
      OFFSET ${Math.floor(event.payload.offset)}
    `);
  } catch(error) {
    // TODO
    throw error;
  }
  return query.rows.map(row => {
    row.address = '0x' + row.address.toString('hex');
    return row;
  });
}

async function getStatus(event) {
  let verified;
  if(event.payload.chainId) {
    verified = await getVerified(event);
  }
  const source = await contractSource(event);
  return {
    verified: verified && verified.body &&
      (typeof verified.body === 'string' ? JSON.parse(verified.body) : verified.body),
    source: source && source.body &&
      (typeof source.body === 'string' ? JSON.parse(source.body) : source.body),
  };
}

function findChain(chainId) {
  for(let chain of chains) {
    if(Number(chainId) === chain.chain.id) return chain;
  }
}

async function verifyContract(event) {
  if(!event.payload)
    throw new Error('missing_payload');
  if(!isAddress(event.payload.address))
    throw new Error('invalid_address');
  if(!event.payload.sourceCode)
    throw new Error('missing_sourceCode');
  if(!event.payload.chainId)
    throw new Error('missing_chainId');
  const chain = findChain(event.payload.chainId);
  if(!chain)
    throw new Error('invalid_chainId');


  const etherscan = new Etherscan(
    chain.apiKey,
    chain.apiUrl,
    chain.chain.blockExplorers.default.url
  );
  const { message: guid } = await etherscan.verify(
    // Contract address
    event.payload.address,
    // Contract source code
    standardJson(event.payload.sourceCode),
    // Contract name
    "contracts/Verified.sol:" + findContractName(event.payload.sourceCode),
    // Compiler version
    SOLC_VERSION,
    // Encoded constructor arguments
    ""
  );

  return {
    statusCode: guid ? 200 : 400,
    body: JSON.stringify({
      guid,
    }),
  };
}

async function checkVerification(event) {
  if(!event.payload)
    throw new Error('missing_payload');
  if(!event.payload.guid)
    throw new Error('missing_guid');
  if(!event.payload.chainId)
    throw new Error('missing_chainId');
  const chain = findChain(event.payload.chainId);
  if(!chain)
    throw new Error('invalid_chainId');

  const etherscan = new Etherscan(
    chain.apiKey,
    chain.apiUrl,
    chain.chain.blockExplorers.default.url
  );
  const result = await etherscan.getVerificationStatus(event.payload.guid);
  const success = result.isSuccess();

  return {
    statusCode: success ? 200 : 404,
    body: JSON.stringify({
      success,
    }),
  };
}

async function contractSource(event) {
  if(!event.payload)
    throw new Error('missing_payload');
  if(!isAddress(event.payload.address))
    throw new Error('invalid_address');

  let query;
  try {
    query = await pool.query(`SELECT * FROM ${TABLE_SOURCES} WHERE address = $1`,
    [
      Buffer.from(event.payload.address.slice(2), 'hex'),
    ]);
  } catch(error) {
    // TODO
    throw error;
  }

  // TODO ddos protection
  if(!event.forceUpdate && query.rows.length) {
    const foundChains = {};
    for(let row of query.rows) {
      foundChains[row.chainid] = row.source_code;
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        chains: foundChains,
      }),
    };
  }

  const reqs = await Promise.all(chains.map(chain => fetch(
    chain.apiUrl +
    '?module=contract' +
    '&action=getsourcecode' +
    '&address=' + event.payload.address +
    '&apikey=' + chain.apiKey
   ).then(response => response.json())));

  const foundChains = {};
  for(let i = 0; i < reqs.length; i++) {
    const data = reqs[i];
    if(!data.result[0].SourceCode) continue;

    const inner = JSON.parse(data.result[0].SourceCode.slice(1, -1));
    const sources = Object.keys(inner.sources).reduce((out, file) => {
      out[file] = inner.sources[file].content;
      return out;
    }, {});
    foundChains[String(chains[i].chain.id)] = sources;
    await pool.query(`
      INSERT INTO ${TABLE_SOURCES} (chainid, address, source_code)
        VALUES ($1, $2, $3)
        ON CONFLICT (chainid, address)
        DO UPDATE SET
            source_code = EXCLUDED.source_code`,
      [
        chains[i].chain.id,
        Buffer.from(event.payload.address.slice(2), 'hex'),
        sources,
      ]);
  }

  if(!Object.keys(foundChains).length) return {
    statusCode: 404,
    body: JSON.stringify({error:'not_verified'}),
  };

  return {
    statusCode: 200,
    body: JSON.stringify({
      chains: foundChains,
    }),
  };
}

async function getVerified(event) {
  if(!event.payload)
    throw new Error('missing_payload');
  if(!isAddress(event.payload.address))
    throw new Error('invalid_address');
  if(!event.payload.chainId)
    throw new Error('missing_chainId');
  const chain = findChain(event.payload.chainId);
  if(!chain)
    throw new Error('invalid_chainId');

  let query;
  try {
    query = await pool.query(`
      SELECT * FROM ${TABLE_VERIFIED} WHERE chainid = $1 AND address = $2
    `,
    [
      event.payload.chainId,
      Buffer.from(event.payload.address.slice(2), 'hex'),
    ]);
  } catch(error) {
    // TODO
    throw error;
  }

  if(query.rows.length) {
    return {
      statusCode: 200,
      body: query.rows[0].payload,
    };
  }
}

async function verify(event) {
  if(!event.payload.chainId)
    throw new Error('missing_chainId');
  const chain = findChain(event.payload.chainId);
  if(!chain)
    throw new Error('invalid_chainId');
  if(!event.payload.contract)
    throw new Error('missing_contract');
  if(!event.payload.signature)
    throw new Error('missing_signature');

  const verified = await getVerified(event);
  if(verified) return verified;

  const ogSource = await contractSource(event);
  if(ogSource.statusCode !== 200) return ogSource;
  const ogObj = JSON.parse(ogSource.body);

  // Default to latest
  const circomVersions = process.env.VITE_CIRCOM_VERSIONS.split(',');
  let circomPath = 'circom-' +  circomVersions[0];
  if('circomVersion' in event.payload && circomVersions.indexOf(event.payload.circomVersion) > -1) {
    circomPath = 'circom-' + event.payload.circomVersion;
  }

  const signer = await recoverMessageAddress({
    signature: event.payload.signature,
    message: JSON.stringify({
      files: event.payload.files,
      file: event.payload.file,
      pubs: event.payload.pubs,
      params: event.payload.params,
      tpl: event.payload.tpl,
      protocol: event.payload.protocol,
      circomPath,
      solidityCode: event.payload.contract,
    }),
  });
  if(signer !== process.env.SIGNER_ADDRESS)
    throw new Error('invalid_signature');

  const contract = event.payload.contract;
  const firstFile = Object.keys(ogObj.chains[event.payload.chainId])[0];
  const diff = diffTrimmedLines(ogObj.chains[event.payload.chainId][firstFile], contract);

  let acceptableDiff = true;
  let lastRemoved = null;
  for(let i = 0; i < diff.length; i++) {
    if(diff[i].removed) {
      if(lastRemoved !== null) {
        // Changes acceptableDiff below
        console.log('removed_after_another_removal', i);
        break;
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
      acceptableDiff = false;
      break;
    } else if(lastRemoved === i - 1 && diff[i].added) {
      lastRemoved = null;
      // Allow only whitespace differences
      if(diff[i-1].value.trim() !== diff[i].value.trim()
        // TODO allow for contract name changes?
        && !(diff[i-1].value.match(CONTRACT_DEF_REGEX)
          && diff[i].value.match(CONTRACT_DEF_REGEX))
        && !(diff[i-1].value.match(GROTH16_ENTROPY_REGEX)
          && diff[i].value.match(GROTH16_ENTROPY_REGEX))
      ) {
        acceptableDiff = false;
        console.log('invalid_change', i);
        break;
      }
    } else if(lastRemoved !== null && diff[i].added) {
      acceptableDiff = false;
      console.log('invalid_removal', i);
      break;
    }
  }
  if(lastRemoved !== null) {
    console.log('invalid_unbalanced_removal', lastRemoved)
    acceptableDiff = false;
  }

  const circuitHash = keccak256(toHex(JSON.stringify({
    files: event.payload.files,
    file: event.payload.file,
    pubs: event.payload.pubs,
    params: event.payload.params,
    tpl: event.payload.tpl,
    protocol: event.payload.protocol,
    circomPath,
  })));

  // Circom sources are stored in S3 during build,
  // store only file hashes in postgres
  const fileHashes = {};
  for(let filename of Object.keys(event.payload.files)) {
    const fileConts = event.payload.files[filename].code;
    const fileHash = keccak256(toHex(fileConts));
    fileHashes[filename] = fileHash;
  }

  const body = {
    payload: {
      ...event.payload,
      files: fileHashes,
    },
    contract,
    ogSource: ogObj.chains[event.payload.chainId][firstFile],
    chainId: event.payload.chainId,
    diff,
    acceptableDiff,
    circuitHash,
  };

  if(acceptableDiff) {
    await pool.query(`
      INSERT INTO ${TABLE_VERIFIED} (chainid, address, payload, circuit_hash)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (chainid, address)
        DO UPDATE SET
            payload = EXCLUDED.payload`,
      [
        event.payload.chainId,
        Buffer.from(event.payload.address.slice(2), 'hex'),
        body,
        Buffer.from(circuitHash.slice(2), 'hex'),
      ]);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(body),
  };
}

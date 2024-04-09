import {readFileSync, writeFileSync, mkdtempSync, rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Circomkit} from 'circomkit';
import {diffTrimmedLines} from 'diff';
import {isAddress} from 'viem';
import {holesky, sepolia} from 'viem/chains';
import {DynamoDBClient, PutItemCommand, GetItemCommand} from '@aws-sdk/client-dynamodb';
import { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan.js";

import { compileSolidityContract } from './solc.js';
import {
  standardJson,
  findContractName,
} from './etherscan.js';

const BUILD_NAME = 'verify_circuit';
const HARDHAT_IMPORT = 'import "hardhat/console.sol";';
const CONTRACT_DEF_REGEX = /^contract [a-zA-Z0-9_]+ {$/;
const GROTH16_ENTROPY_REGEX = /^uint256 constant deltax1 = \d+;\nuint256 constant deltax2 = \d+;\nuint256 constant deltay1 = \d+;\nuint256 constant deltay2 = \d+;\n$/;

const db = new DynamoDBClient({ region: "us-west-2" });
const TableName = 'circuitscan1';


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
    case 'get-status':
      return getStatus(event);
    case 'verify':
      return verify(event);
    case 'build':
      return build(event);
    case 'verify-contract':
      return verifyContract(event);
    case 'check-verify-contract':
      return checkVerification(event);
    default:
      throw new Error('invalid_command');
  }
}

async function getStatus(event) {
  let verified;
  if(event.payload.chainId) {
    verified = await getVerified(event);
  }
  const source = await contractSource(event);
  return {
    verified: verified && verified.body && JSON.parse(verified.body),
    source: source && source.body && JSON.parse(source.body),
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
    "v0.8.25+commit.b61c2a91",
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

  let existing;
  try {
    existing = await db.send(new GetItemCommand({
      TableName,
      Key: { id: { S: `${event.payload.address}-ogSource` } },
    }));
  } catch(error) {
    if(error.errorType !== 'ResourceNotFoundException')
      throw error;
  }

  // TODO ddos protection
  if(!event.forceUpdate && existing && 'Item' in existing) {
    const foundChains = existing.Item.chains.M;
    for(let chain of Object.keys(foundChains)) {
      foundChains[chain] = foundChains[chain].S;
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
    foundChains[String(chains[i].chain.id)] =
      inner.sources[Object.keys(inner.sources)[0]].content;
  }

  if(!Object.keys(foundChains).length) return {
    statusCode: 404,
    body: JSON.stringify({error:'not_verified'}),
  };

  await db.send(new PutItemCommand({
    TableName,
    Item: {
      id: { S: `${event.payload.address}-ogSource` },
      chains: {
        M: Object.keys(foundChains).reduce((out, cur) => {
          out[cur] = { S: foundChains[cur] };
          return out;
        }, {}),
      },
    },
  }));

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

  let existing;
  try {
    existing = await db.send(new GetItemCommand({
      TableName,
      Key: { id: { S: `${event.payload.address}-${event.payload.chainId}-verified` } },
    }));
  } catch(error) {
    if(error.errorType !== 'ResourceNotFoundException')
      throw error;
  }

  if(existing && 'Item' in existing) {
    return {
      statusCode: 200,
      body: existing.Item.body.S,
    };
  }
}

async function build(event, returnDirect) {
  const dirCircuits = mkdtempSync(join(tmpdir(), 'circuits-'));
  for(let file of Object.keys(event.payload.files)) {
    let code = event.payload.files[file].code;
    const imports = Array.from(code.matchAll(/include "([^"]+)";/g));
    for(let include of imports) {
      const filename = include[1].split('/').at(-1);
      code = code.replaceAll(include[0], `include "${filename}";`);
    }
    writeFileSync(join(dirCircuits, file), code);
  }

  const config = {
    dirCircuits,
    protocol: event.payload.protocol,
  };

  if(config.protocol === 'groth16') {
    Object.assign(config, {
      prime: 'bn128',
      groth16numContributions: 1,
      groth16askForEntropy: false,
    });
  }

  const circomkit = new Circomkit(config);

  await circomkit.compile(BUILD_NAME, {
    file: event.payload.file.replace('.circom', ''),
    template: event.payload.tpl,
    params: JSON.parse(`[${event.payload.params}]`),
    pubs: event.payload.pubs.split(',').map(x=>x.trim()).filter(x=>!!x),
  });

  await circomkit.setup(BUILD_NAME);
  await circomkit.vkey(BUILD_NAME);
  const contractPath = await circomkit.contract(BUILD_NAME);
  let solidityCode = readFileSync(contractPath, {encoding: 'utf8'});
  // XXX: plonk output has an errant hardhat debug include?
  if(solidityCode.indexOf(HARDHAT_IMPORT) > -1) {
    solidityCode = solidityCode.replace(HARDHAT_IMPORT, '');
    writeFileSync(contractPath, solidityCode);
  }
  if(returnDirect) return solidityCode;

  const compiled = await compileSolidityContract(contractPath);
  return {
    statusCode: 200,
    body: JSON.stringify({
      solidityCode,
      compiled,
    }),
  };
}

// TODO ddos protection!
async function verify(event) {
  if(!event.payload.chainId)
    throw new Error('missing_chainId');
  const chain = findChain(event.payload.chainId);
  if(!chain)
    throw new Error('invalid_chainId');

  const verified = await getVerified(event);
  if(verified) return verified;

  const ogSource = await contractSource(event);
  if(ogSource.statusCode !== 200) return ogSource;
  const ogObj = JSON.parse(ogSource.body);


  const contract = await build(event, true);
  const diff = diffTrimmedLines(ogObj.chains[event.payload.chainId], contract);

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

  const body = JSON.stringify({
    payload: event.payload,
    contract,
    ogSource: ogObj.chains[event.payload.chainId],
    chainId: event.payload.chainId,
    diff,
    acceptableDiff,
  });

  if(acceptableDiff) {
    await db.send(new PutItemCommand({
      TableName,
      Item: {
        id: { S: `${event.payload.address}-${event.payload.chainId}-verified` },
        body: { S: body },
      },
    }));
  }

  return {
    statusCode: 200,
    body,
  };
}

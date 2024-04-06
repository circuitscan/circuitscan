import {readFileSync, writeFileSync, mkdtempSync, rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Circomkit} from 'circomkit';
import {diffTrimmedLines} from 'diff';
import {isAddress} from 'viem';
import {DynamoDBClient, PutItemCommand, GetItemCommand} from '@aws-sdk/client-dynamodb';

const BUILD_NAME = 'verify_circuit';
const CONTRACT_DEF_REGEX = /^contract [a-zA-Z0-9_]+ {$/;
const GROTH16_ENTROPY_REGEX = /^uint256 constant deltax1 = \d+;\nuint256 constant deltax2 = \d+;\nuint256 constant deltay1 = \d+;\nuint256 constant deltay2 = \d+;\n$/;

const db = new DynamoDBClient({ region: "us-west-2" });
const TableName = 'circuitscan1';

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
    default:
      throw new Error('invalid_command');
  }
}

async function getStatus(event) {
  const verified = await getVerified(event);
  if(verified) return verified;

  const ogSource = await contractSource(event);
  return ogSource;
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

  if(existing && 'Item' in existing) {
    return {
      statusCode: 200,
      body: JSON.stringify(existing.Item.code.S),
    };
  }

  // TODO support different chains
  const response = await fetch(
    'https://api-holesky.etherscan.io/api' +
    '?module=contract' +
    '&action=getsourcecode' +
    '&address=' + event.payload.address +
    '&apikey=' + process.env.ETHERSCAN_API_KEY
  );
  const data = await response.json();

  if(!data.result[0].SourceCode) return {
    statusCode: 404,
    body: JSON.stringify({error:'not_verified'}),
  };

  const inner = JSON.parse(data.result[0].SourceCode.slice(1, -1));
  const code = inner.sources[Object.keys(inner.sources)[0]].content;

  await db.send(new PutItemCommand({
    TableName,
    Item: {
      id: { S: `${event.payload.address}-ogSource` },
      code: { S: code },
    },
  }));

  return {
    statusCode: 200,
    body: JSON.stringify(code),
  };
}

async function getVerified(event) {
  if(!event.payload)
    throw new Error('missing_payload');
  if(!isAddress(event.payload.address))
    throw new Error('invalid_address');

  let existing;
  try {
    existing = await db.send(new GetItemCommand({
      TableName,
      Key: { id: { S: `${event.payload.address}-verified` } },
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

// TODO ddos protection!
async function verify(event) {
  const verified = await getVerified(event);
  if(verified) return verified;

  const ogSource = await contractSource(event);
  if(ogSource.statusCode !== 200) return ogSource;

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
  const contract = readFileSync(contractPath, {encoding: 'utf8'});

  const diff = diffTrimmedLines(JSON.parse(ogSource.body), contract);

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
      // XXX: plonk output has an errant hardhat debug include?
      // Accept the verified source if this is removed
      && diff[i].value.trim() !== 'import "hardhat/console.sol";'
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
    ogSource: JSON.parse(ogSource.body),
    diff,
    acceptableDiff,
  });

  if(acceptableDiff) {
    await db.send(new PutItemCommand({
      TableName,
      Item: {
        id: { S: `${event.payload.address}-verified` },
        body: { S: body },
      },
    }));
  }

  return {
    statusCode: 200,
    body,
  };
}

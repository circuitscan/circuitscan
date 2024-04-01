import {readFileSync, writeFileSync, mkdirSync, rmdirSync} from 'node:fs';
import {Circomkit} from 'circomkit';
import {diffTrimmedLines} from 'diff';
import {isAddress} from 'viem';
import {DynamoDBClient, PutItemCommand, GetItemCommand} from '@aws-sdk/client-dynamodb';

const BUILD_NAME = 'verify_circuit';

const db = new DynamoDBClient({ region: "us-west-2" });
const TableName = 'circuitscan1';

export async function handler(event) {
  switch(event.payload.action) {
    case 'contract-source':
      return contractSource(event);
    case 'get-verified':
      return getVerified(event);
    case 'verify':
      return verify(event);
    default:
      throw new Error('invalid_command');
  }
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

async function verify(event) {
  const verified = await getVerified(event);
  if(verified) return verified;

  const ogSource = await contractSource(event);
  if(ogSource.statusCode !== 200) return ogSource;

  try {
    rmdirSync('circuits', { recursive: true });
  } catch(error) {
    // No worries, nothing to delete on first run
  }
  mkdirSync('circuits');
  for(let file of Object.keys(event.payload.files)) {
    let code = event.payload.files[file].code;
    const imports = Array.from(code.matchAll(/include "([^"]+)";/g));
    for(let include of imports) {
      const filename = include[1].split('/').at(-1);
      code = code.replaceAll(include[0], `include "${filename}";`);
    }
    writeFileSync(`circuits/${file}`, code);
  }

  const config = {
    "protocol": event.payload.protocol,
  };

  if(config.protocol === 'groth16') {
    Object.assign(config, {
      "prime": "bn128",
      "groth16numContributions": 1,
      "groth16askForEntropy": false,
    });
  }

  const circomkit = new Circomkit(config);

  await circomkit.compile(BUILD_NAME, {
    file: event.payload.file.replace('.circom', ''),
    template: event.payload.tpl,
    params: JSON.parse(`[${event.payload.params}]`),
  });

  await circomkit.setup(BUILD_NAME);
  await circomkit.vkey(BUILD_NAME);
  const contractPath = await circomkit.contract(BUILD_NAME);
  const contract = readFileSync(contractPath, {encoding: 'utf8'});

  const diff = diffTrimmedLines(JSON.parse(ogSource.body), contract);
  const body = JSON.stringify({
    payload: event.payload,
    contract,
    ogSource: JSON.parse(ogSource.body),
    diff,
  });

  if(diff.length === 1) {
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

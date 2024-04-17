import {readFileSync, writeFileSync, mkdtempSync, rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import pg from 'pg';
import {Circomkit} from 'circomkit';
import {keccak256, toHex} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { compileSolidityContract } from './solc.js';
import {fullProve} from './prove.js';

const BUILD_NAME = 'verify_circuit';
const HARDHAT_IMPORT = 'import "hardhat/console.sol";';
const TABLE_PROVERS = 'circom_provers';
const Bucket = process.env.BLOB_BUCKET;

const s3 = new S3Client({ region: process.env.BLOB_BUCKET_REGION });
const pool = new pg.Pool({
  connectionString: process.env.PG_CONNECTION,
});

const account = privateKeyToAccount(process.env.SIGNER_PRIVATE_KEY);

export async function handler(event) {
  if('body' in event) {
    // Running on AWS
    event = JSON.parse(event.body);
  }
  switch(event.payload.action) {
    case 'build':
      return build(event);
    case 'prove':
      return prove(event);
    default:
      throw new Error('invalid_command');
  }
}

async function prove(event) {
  if(!event.payload.circuitHash || !(typeof event.payload.circuitHash === 'string'))
    throw new Error('invalid_circuitHash');

  const query = await pool.query(
    `SELECT * FROM ${TABLE_PROVERS} WHERE circuit_hash = $1`,
    [
      Buffer.from(event.payload.circuitHash.slice(2), 'hex'),
    ]
  );

  let result;
  try {
    result = await fullProve(
      event.payload.input,
      event.payload.protocol,
      query.rows[0].wasm,
      query.rows[0].pkey,
    );
  } catch(error) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        errorType: 'error',
        errorMessage: error.message
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}

async function build(event) {
  const dirCircuits = mkdtempSync(join(tmpdir(), 'circuits-'));
  const dirPtau = mkdtempSync(join(tmpdir(), 'ptau-'));
  const dirBuild = mkdtempSync(join(tmpdir(), 'build-'));
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
    dirPtau,
    dirBuild,
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

  const circuitHash = keccak256(toHex(JSON.stringify({
    files: event.payload.files,
    file: event.payload.file,
    pubs: event.payload.pubs,
    params: event.payload.params,
    tpl: event.payload.tpl,
    protocol: event.payload.protocol,
  })));

  await pool.query(`
    INSERT INTO ${TABLE_PROVERS} (circuit_hash, wasm, pkey)
      VALUES ($1, $2, $3)
      ON CONFLICT (circuit_hash) DO NOTHING`,
    [
      Buffer.from(circuitHash.slice(2), 'hex'),
      readFileSync(join(dirBuild, BUILD_NAME, BUILD_NAME + '_js', BUILD_NAME + '.wasm')),
      readFileSync(join(dirBuild, BUILD_NAME, event.payload.protocol + '_pkey.zkey')),
    ]);

  // Circom sources to S3 in order to use Cloudflare caching
  for(let filename of Object.keys(event.payload.files)) {
    const fileConts = event.payload.files[filename].code;
    const fileHash = keccak256(toHex(fileConts));

    await s3.send(new PutObjectCommand({
      Bucket,
      Key: fileHash,
      Body: fileConts,
    }));
  }

  const compiled = await compileSolidityContract(contractPath);
  return {
    statusCode: 200,
    body: JSON.stringify({
      solidityCode,
      compiled,
      circuitHash,
      signature: await account.signMessage({ message: JSON.stringify({
        files: event.payload.files,
        file: event.payload.file,
        pubs: event.payload.pubs,
        params: event.payload.params,
        tpl: event.payload.tpl,
        protocol: event.payload.protocol,
        solidityCode,
      })}),
    }),
  };
}

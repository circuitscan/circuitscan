import {readFileSync, writeFileSync, mkdtempSync, rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Circomkit} from 'circomkit';

import { compileSolidityContract } from './solc.js';

const BUILD_NAME = 'verify_circuit';
const HARDHAT_IMPORT = 'import "hardhat/console.sol";';

export async function handler(event) {
  if('body' in event) {
    // Running on AWS
    event = JSON.parse(event.body);
  }
  switch(event.payload.action) {
    case 'build':
      return build(event);
    default:
      throw new Error('invalid_command');
  }
}

// TODO sign the result
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

  const compiled = await compileSolidityContract(contractPath);
  return {
    statusCode: 200,
    body: JSON.stringify({
      solidityCode,
      compiled,
    }),
  };
}

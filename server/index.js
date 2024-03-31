import {readFileSync, writeFileSync, mkdirSync, rmdirSync} from 'node:fs';
import {Circomkit} from 'circomkit';

const BUILD_NAME = 'verify_circuit';

export async function handler(event) {
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
  console.log(contractPath);
  const contract = readFileSync(contractPath, {encoding: 'utf8'});

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      contract,
    }),
  };
  return response;
};


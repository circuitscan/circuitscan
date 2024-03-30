import {readFileSync, writeFileSync} from 'node:fs';
import {Circomkit} from 'circomkit';

const BUILD_NAME = 'verify_circuit';

const circomkit = new Circomkit({
//   "protocol": "fflonk",
  "protocol": "groth16",
  "prime": "bn128",
  "version": "2.1.5",
  "optimization": 2,
  "groth16numContributions": 3,
  "groth16askForEntropy": false,
});

await circomkit.compile(BUILD_NAME, {
  file: 'multiplier',
  template: 'Multiplier',
  params: [3],
});

await circomkit.setup(BUILD_NAME);
await circomkit.vkey(BUILD_NAME);
const contractPath = await circomkit.contract(BUILD_NAME);
console.log(contractPath);
// const contract = readFileSync(contractPath, {encoding: 'utf8'});

// const response = await fetch('https://api-holesky.etherscan.io/api?module=contract&action=getsourcecode&address=0x4274df42c7e3d9de29d7e20f2bd0883567ed5c34&apikey=YourApiKeyToken');
// const result = await response.json();
// const inner = JSON.parse(result.result[0].SourceCode.slice(1, -1));
// const verifiedSrc = inner.sources[Object.keys(inner.sources)[0]].content;
// console.log('=============================');
// console.log(verifiedSrc.length, contract.length, verifiedSrc == contract);
// writeFileSync('test.sol', verifiedSrc);

process.exit(0);

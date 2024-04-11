import * as fs from 'node:fs';
import { exec } from 'node:child_process';

/**
 * Compiles a Solidity contract using solc.
 * @param {string} sourceCode The Solidity source code.
 * @param {string} contractFileName The name of the Solidity file (e.g., "MyContract.sol").
 */
export function compileSolidityContract(filePath) {
  return new Promise((resolve, reject) => {
    // Construct the solc command
    const cmd = `solc --optimize --combined-json abi,bin ${filePath}`;

    // Execute the solc command
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Execution error: ${error}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }

      // Process the compilation output
      console.log('Compilation output:', stdout);
      const compilerOutput =JSON.parse(stdout).contracts;
      const compiled = compilerOutput[Object.keys(compilerOutput)[0]];
      resolve(compiled);
    });
  });
}

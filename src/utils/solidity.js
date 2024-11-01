import { fetchSolc } from "web-solc";

const SOLC_VERSION = "0.8.26";

export async function verifyOnSourcify(chainId, contractAddress, contractSource, solcOutput) {
  try {
    const sourceFiles = { 'verifier.sol': contractSource };
    const apiUrl = `https://sourcify.dev/server/verify`;

    // Prepare form data
    const formData = new FormData();
    formData.append("address", contractAddress);
    formData.append("chain", chainId);

    // Append each source file to formData
    for (const [filePath, fileContent] of Object.entries(sourceFiles)) {
      const fileBlob = new Blob([fileContent], { type: 'text/plain' });
      formData.append("files", fileBlob, filePath);
    }

    // Add metadata file
    const metadataBlob = new Blob([JSON.stringify(solcOutput.metadata)], { type: 'application/json' });
    formData.append("files", metadataBlob, "metadata.json");

    // Send the request to Sourcify API
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });

    // Handle the response
    if (response.ok) {
      const result = await response.json();
      console.log("Verification successful:", result);
      return result;
    } else {
      const errorText = await response.text();
      console.error("Verification failed:", errorText);
      throw new Error(errorText);
    }
  } catch (error) {
    console.error("Error verifying contract:", error);
    throw error;
  }
}

// Thanks ChatGPT
async function retryAsync(asyncFunction, retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await asyncFunction();
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

export function verifyOnSourcifyWithRetry(...args) {
  return retryAsync(async () => verifyOnSourcify(...args), 3, 6000);
}

export async function compileContract(source) {
  const input = standardJson(source);
  const contractName = findContractName(source);
  const {compile, stopWorker} = await fetchSolc(SOLC_VERSION);
  const output = await compile(input);
  if(output.errors) {
    const errors = output.errors.filter(x => x.severity !== 'warning');
    if(errors.length) {
      // Compiler errors
      console.error('Solidity Verifier Compilation Error!');
      for(let i = 0; i<errors.length; i++) {
        console.error(errors[i].formattedMessage);
      }
      throw new Error('solc_failed');
    }
  }
  const contract = output.contracts['contracts/Verified.sol'][contractName];

  return {
    abi: contract.abi,
    metadata: contract.metadata,
    bytecode: contract.evm.bytecode.object,
    contractName,
    input,
    version: SOLC_VERSION,
  };
}

function findContractName(soliditySource, returnAll) {
  const regex = /contract\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:is\s+[a-zA-Z_][a-zA-Z0-9_,\s]*)?\s*\{/g;
  const matches = [];

  for (const match of soliditySource.matchAll(regex)) {
    matches.push(match[1]);
  }

  // Return the last contract by default
  // Because noir outputs 2 contracts in the verifier file
  if(!returnAll && matches.length > 0) return matches[matches.length - 1];

  return matches.length > 0 ? matches : null;
}

function standardJson(soliditySource) {
  return {
    "language": "Solidity",
    "sources": {
      "contracts/Verified.sol": {
        "content": soliditySource,
      }
    },
    "settings": {
      "optimizer": {
        "enabled": true,
        "runs": 200
      },
      "outputSelection": {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "evm.methodIdentifiers",
            "metadata"
          ],
          "": [
            "ast"
          ]
        }
      }
    }
  };
}

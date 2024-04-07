export function standardJson(soliditySource) {
  return JSON.stringify({
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
  });
}

export function findContractName(soliditySource) {
  const regex = /contract\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/;
  const match = soliditySource.match(regex);
  return match ? match[1] : null;
}


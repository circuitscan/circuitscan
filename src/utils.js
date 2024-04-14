import * as chains from 'viem/chains';
import { toast } from 'react-hot-toast';


export function findChain(chainId) {
  for(let chain of Object.keys(chains)) {
    if(Number(chainId) === chains[chain].id) return chains[chain];
  }
}


export async function setClipboard(text) {
  if (!navigator.clipboard) {
    toast.error('Clipboard API is not available in this browser.');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  } catch (err) {
    toast.error('Failed to copy to clipboard');
  }
}

export function verifierABI(protocol, pubCount) {
  if(protocol === 'fflonk') {
    return [{"inputs":[{"internalType":"bytes32[24]","name":"proof","type":"bytes32[24]"},{"internalType":`uint256[${pubCount}]`,"name":"pubSignals","type":`uint256[${pubCount}]`}],"name":"verifyProof","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}];
  } else if(protocol === 'plonk') {
    return [{"inputs":[{"internalType":"uint256[24]","name":"_proof","type":"uint256[24]"},{"internalType":`uint256[${pubCount}]`,"name":"_pubSignals","type":`uint256[${pubCount}]`}],"name":"verifyProof","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]
  } else if(protocol === 'groth16') {
    return [{"inputs":[{"internalType":"uint256[2]","name":"_pA","type":"uint256[2]"},{"internalType":"uint256[2][2]","name":"_pB","type":"uint256[2][2]"},{"internalType":"uint256[2]","name":"_pC","type":"uint256[2]"},{"internalType":`uint256[${pubCount}]`,"name":"_pubSignals","type":`uint256[${pubCount}]`}],"name":"verifyProof","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}]
  }
}

// Thanks ChatGPT
export function extractCircomTemplate(sourceCode, templateName) {
    // Find the starting index of the template
    const templateStartRegex = new RegExp(`template ${templateName}\\s*\\(([^)]*)\\)\\s*{`, 'g');
    const startMatch = templateStartRegex.exec(sourceCode);
    if (!startMatch) {
        return null; // Template not found
    }

    // Extracting the parameters
    const params = startMatch[1].trim().split(',').map(param => param.trim()).filter(param => param.length > 0);

    // Start parsing after the initial match
    let index = startMatch.index + startMatch[0].length - 1; // -1 to include the opening '{'
    let braceDepth = 1; // Start inside the first opening brace
    let templateEnd = index;
    let codeBlock = startMatch[0];

    // Iterate through the source code starting after the opening brace to find the matching closing brace
    while (braceDepth > 0 && templateEnd < sourceCode.length) {
        templateEnd++;
        codeBlock += sourceCode[templateEnd];
        if (sourceCode[templateEnd] === '{') {
            braceDepth++;
        } else if (sourceCode[templateEnd] === '}') {
            braceDepth--;
        }
    }

    // Check if we've correctly closed all braces
    if (braceDepth !== 0) {
        return null; // Error in template syntax or unmatched braces
    }

    // Extract the complete template block
    const template = sourceCode.substring(startMatch.index, templateEnd + 1);

    // Extract signal inputs
    const inputSignalRegex = /signal input ([\w\s,\[\]*\/+%-]+);/g;
    let signalMatch;
    let signalInputs = [];

    while ((signalMatch = inputSignalRegex.exec(template)) !== null) {
        // Split signals on comma, then clean up and include any array declarations
        signalInputs = signalInputs.concat(signalMatch[1].split(',').map(signal => {
            // Remove extra spaces and include array sizes
            let trimmedSignal = signal.trim();
            let arrayMatch = trimmedSignal.match(/(\w+)\s*\[(.+)\]/);
            if (arrayMatch) {
                return { name: arrayMatch[1], arraySize: arrayMatch[2].trim() };
            }
            return { name: trimmedSignal };
        }));
    }

    // Return the extracted template, parameters, and signal inputs
    return {
        template: template,
        parameters: params,
        signalInputs: signalInputs,
        tplArgs: template.match(
          new RegExp(`template\\s+${templateName}\\((.*?)\\)\\s*\\{`)
        ),
    };
}

export function inputTemplate(details, params) {
  const out = {};
  const paramsSpl = params
    .split(',').map(x=>x.trim()).filter(x=>!!x);
  const paramNames = details.tplArgs[1]
    .split(',').map(x=>x.trim()).filter(x=>!!x);
  if(paramsSpl.length !== paramNames.length)
    throw new Error('param_length_mismatch');

  const paramObj = paramNames
    .reduce((out, cur, index) => {
      out[cur] = paramsSpl[index];
      return out;
    }, {});
  for(let signal of details.signalInputs) {
    out[signal.name] = signal.arraySize
      ? makeArray(evaluateExpression(signal.arraySize, paramObj), 1)
      : 1; // dummy value
  }
  return out;
}

// Thanks ChatGPT
function makeArray(length, fill) {
    const result = [];  // Initialize an empty array
    for (let i = 0; i < length; i++) {
        result.push(fill);  // Push the fill value into the array for each iteration
    }
    return result;  // Return the filled array
}

// Thanks ChatGPT
function evaluateExpression(expression, variables) {
    const ops = {
        '+': (a, b) => a + b,
        '-': (a, b) => a - b,
        '*': (a, b) => a * b,
        '/': (a, b) => a / b,
        '%': (a, b) => a % b,
    };
    
    const precedence = {
        '+': 1,
        '-': 1,
        '*': 2,
        '/': 2,
        '%': 2
    };

    // Tokenize the expression
    const tokens = expression.match(/(?:[a-z0-9_]+|\d+|[+*/%-])/gi);

    // Stack for values and operators
    const values = [];
    const operators = [];

    // Helper function to perform operation based on precedence
    const applyOperator = (operator, second, first) => {
        if (operator in ops) {
            return ops[operator](first, second);
        }
        throw new Error('Unsupported operator ' + operator);
    };

    // Handle each token
    tokens.forEach(token => {
        if (!isNaN(token)) {
            // Push number directly to values stack
            values.push(parseInt(token, 10));
        } else if (token in variables) {
            // Replace token with corresponding variable value
            values.push(variables[token]);
        } else if (token in ops) {
            // Apply all operators with higher or equal precedence
            while (operators.length !== 0 && precedence[operators[operators.length - 1]] >= precedence[token]) {
                values.push(applyOperator(operators.pop(), values.pop(), values.pop()));
            }
            // Push current operator to stack
            operators.push(token);
        } else {
            throw new Error('Invalid token: ' + token);
        }
    });

    // Apply remaining operators
    while (operators.length !== 0) {
        values.push(applyOperator(operators.pop(), values.pop(), values.pop()));
    }

    // The final value on the stack is the result
    return values.pop();
}

import * as chains from 'viem/chains';
import { toast } from 'react-hot-toast';
import S3RangeZip from 's3-range-zip';

const blobCache = {};
const infoCache = {};

export function removeDuplicates(obj) {
  const uniqueIds = new Set();
  const result = {};

  for (const key in obj) {
    const currentItem = obj[key];

    // Check if the id is already in the uniqueIds set
    if (!uniqueIds.has(currentItem.id)) {
      // If not, add the id to the set and the key-value pair to the result
      uniqueIds.add(currentItem.id);
      result[key] = currentItem;
    }
  }

  return result;
}

export async function generateSHA256Hash(message) {
  const msgUint8 = new TextEncoder().encode(message); // encode the message as a UTF-8 array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

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

export function formatDuration(seconds) {
    // Calculate hours, minutes, and seconds
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    // Format each part to ensure two digits where appropriate
    const formattedMins = hrs > 0 ? String(mins).padStart(2, '0') : mins;
    const formattedSecs = String(secs).padStart(2, '0');

    // Construct the time string
    return hrs > 0 ? `${hrs}:${formattedMins}:${formattedSecs}` : `${formattedMins}:${formattedSecs}`;
}

export function formatBytes(bytes, decimals = 2) {
    if (isNaN(bytes)) return 'Unknown Size';
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    // ChatGPT predicts large circuits ahead!
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function loadListOrFile(zipUrl, filename, returnBinary = false, setProgress) {
  const zipReader = new S3RangeZip((bucketName, key) => `https://${bucketName}.s3.${import.meta.env.VITE_BB_REGION}.amazonaws.com/${key}`);
  const fileList = await zipReader.fetchFileList(
    import.meta.env.VITE_BB_BUCKET,
    zipUrl
  );

  if(filename) {
    const file = await zipReader.downloadFile(
      import.meta.env.VITE_BB_BUCKET,
      zipUrl,
      filename,
      {
        encoding: returnBinary ? undefined : 'utf8',
        onProgress(received, total) {
          setProgress && setProgress([received, total]);
        },
      }
    );
    return file;
  }

  return fileList;
}

export function getImports(circomCode) {
  return Array.from(circomCode.matchAll(/include "([^"]+)";/g)).map(x=>x[1]);
}

export function joinPaths(basePath, relativePath) {
    // Create a new URL object using the basePath as the base URL
    const baseUrl = new URL(basePath, 'http://example.com/');

    // Create a new URL object using the relativePath and the base URL
    const resolvedUrl = new URL(relativePath, baseUrl);

    // Return the pathname of the resolved URL, which is the joined path
    return resolvedUrl.pathname.substring(1); // Remove the leading '/'
}

// Thanks ChatGPT
export function extractCircomTemplate(sources, templateName, typeName = 'template') {
    // Allow specifying single file or multi-file
    if(typeof sources === 'string') sources = [sources];
    for(let sourceCode of sources) {
        // Find the starting index of the template
        const templateStartRegex = new RegExp(`${typeName}\\s+${templateName}\\s*(\\([^)]*\\))?\\s*{`, 'g');
        const startMatch = templateStartRegex.exec(sourceCode);
        if (!startMatch) {
            continue; // Template not found
        }

        // Extracting the parameters (if present)
        let params = [];
        if (startMatch[1]) { // If parentheses and parameters exist
            params = startMatch[1]
                .replace(/[()]/g, '') // Remove parentheses
                .split(',')
                .map(param => param.trim())
                .filter(param => param.length > 0);
        }


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

        // Extract signal inputs and buses
        const inputSignalRegex = typeName === 'template'
          ? /(signal|[\S]+\([\w\s,\[\]*\/+%-]+\)) input ([\w\s,\[\]*\/+%-]+);/g
          : typeName === 'bus'
          ? /(signal|[\S]+\([\w\s,\[\]*\/+%-]+\)) ([\w\s,\[\]*\/+%-]+);/g
          : null;
        let signalMatch;
        let signalInputs = [];

        if(inputSignalRegex) {
            while ((signalMatch = inputSignalRegex.exec(template)) !== null) {
                // Split signals on comma, then clean up and include any array declarations
                const signals = signalMatch[2].split(',');
                for(let signal of signals) {
                    // Remove extra spaces and include array sizes
                    let trimmedSignal = signal.trim();
                    const out = { name: trimmedSignal };
                    let arrayMatch = trimmedSignal.match(/(\w+)\s*\[(.+)\]/);
                    if (arrayMatch) {
                        out.name = arrayMatch[1];
                        out.arraySize = arrayMatch[2].trim();
                    }
                    if(signalMatch[1] !== 'signal') {
                        const busSplit = signalMatch[1].split('(');
                        // It's a bus
                        out.busName = busSplit[0];
                        out.busParams = busSplit[1].slice(0, -1).split(',');
                        out.busDetails = extractCircomTemplate(sources, out.busName, 'bus');
                        // Exit function and add more imported files
                        if(!out.busDetails) return null;
                    }
                    signalInputs.push(out);
                }
            }
        }

        // Return the extracted template, parameters, and signal inputs
        return {
            template: template,
            parameters: params,
            signalInputs: signalInputs,
        };
    }
    return null;
}

export async function p0tionDetails(finalZkeyUrl) {
  const response = await fetch(`${import.meta.env.VITE_BLOB_URL}p0tion.json`);
  const data = await response.json();
  return data.zkeys[finalZkeyUrl];
}

export async function fetchInfo(pkgName) {
  if(pkgName in infoCache) return infoCache[pkgName];
  const response = await fetch(`${import.meta.env.VITE_BLOB_URL}build/${pkgName}/info.json`);
  const data = await response.json();
  infoCache[pkgName] = data;
  return data;
}

export function inputTemplate(details, params, startParam = {}) {
  const out = {};

  if(params.length !== details.parameters.length)
    throw new Error('param_length_mismatch');

  const paramObj = details.parameters
    .reduce((out, cur, index) => {
      if(!(cur in out)) out[cur] = params[index];
      return out;
    }, startParam);
  for(let signal of details.signalInputs) {
    out[signal.name] = signal.arraySize
      ? makeArray(evaluateExpression(signal.arraySize, paramObj), 1)
      : signal.busName && signal.busDetails
      ? inputTemplate(signal.busDetails, signal.busParams, paramObj)
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
            values.push(evaluateExpression(variables[token], {}));
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

import { isAddress } from 'viem';
import * as chains from 'viem/chains';

import {transformS3Json} from './utils.js';

export async function insertDirectoryContract(body) {
  if(!body.projectName) return {
    statusCode: 400,
    body: JSON.stringify({
      errorType: 'bad_request',
      errorMessage: 'Missing Project Name',
    }),
  };

  if(!body.contractName) return {
    statusCode: 400,
    body: JSON.stringify({
      errorType: 'bad_request',
      errorMessage: 'Missing Contract Name',
    }),
  };

  if(!isAddress(body.contractAddress)) return {
    statusCode: 400,
    body: JSON.stringify({
      errorType: 'bad_request',
      errorMessage: 'Invalid Contract Address',
    }),
  };

  if(isNaN(body.chainId)
      || Object.values(chains).findIndex(chain => chain.id === body.chainId) === -1) return {
    statusCode: 400,
    body: JSON.stringify({
      errorType: 'bad_request',
      errorMessage: 'Invalid Chain ID',
    }),
  };

  try {
    const assoc = await (await fetch(`${process.env.BLOB_URL}assoc/${body.contractAddress.toLowerCase()}.json`)).json();
    if(!(body.chainId in assoc)) return {
      statusCode: 400,
      body: JSON.stringify({
        errorType: 'bad_request',
        errorMessage: 'Contract at this address on this chain is not a verified verifier',
      }),
    };
  } catch(error) {
    console.error(error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        errorType: 'bad_request',
        errorMessage: 'Contract at this address is not a verified verifier',
      }),
    };
  }

  await transformS3Json(process.env.ASSOC_BUCKET, `directory.json`, data => {
    if(!('projects' in data))
      data.projects = {};
    if(!(body.projectName in data.projects))
      data.projects[body.projectName] = {};
    if(!(body.chainId in data.projects[body.projectName]))
      data.projects[body.projectName][body.chainId] = {};
    if(!(body.contractName in data.projects[body.projectName][body.chainId]))
      data.projects[body.projectName][body.chainId][body.contractName] = { contracts: [] };

    data.projects[body.projectName][body.chainId][body.contractName].contracts.push(body.contractAddress);

    return data;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
    }),
  };
}

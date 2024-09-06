import { randomBytes } from 'node:crypto';
import { isAddress } from 'viem';

import {transformS3Json} from './utils.js';

// Invoked by CLI
export async function storeSolcOutput(body) {
  const reference = randomBytes(16).toString('hex');
  // TODO some kind of check so users can't store any valid json
  await transformS3Json(process.env.ASSOC_BUCKET, `solc/${reference}.json`, data => {
    // Should never happen with 16 random bytes
    if('body' in data) throw new Error('duplicate_reference_try_again');
    data.body = body;
    return data;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
      reference,
    }),
  };
}

// Invoked from browser
export async function storeDeployedAddress(body) {
  await transformS3Json(process.env.ASSOC_BUCKET, `browser-deployed/${body.reference}.json`, data => {
    if('address' in data) throw new Error('already_deployed');
    if(!isAddress(body.address)) throw new Error('invalid_address');
    if(isNaN(body.chainId)) throw new Error('invalid_chainId');
    data.address = body.address;
    data.chainId = body.chainId;
    return data;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
    }),
  };
}

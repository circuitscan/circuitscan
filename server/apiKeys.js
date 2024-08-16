import { randomBytes } from 'node:crypto';
import { verifyMessage } from 'viem';

import {transformS3Json} from './utils.js';

const CENSOR_LEN = 6;

export async function listApiKey(body) {
  await verifySignature(body, 'List API Keys');

  let output;
  await transformS3Json(process.env.APIKEY_BUCKET, `keys/${body.address}.json`, data => {
    if(!('nonces' in data))
      data.nonces = [];
    if(data.nonces.includes(body.nonce))
      throw new Error('duplicate_nonce');

    data.nonces.push(body.nonce);

    output = (data.keys || []).filter(item => !item.inactive).map(item => ({
      ...item,
      secret: censorApiKey(item.secret),
    }));

    return data;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
      output,
    }),
  };
}

export async function removeApiKey(body) {
  await verifySignature(body, 'Remove API Key: ' + body.keyToRemove);

  let output, fullKey;
  await transformS3Json(process.env.APIKEY_BUCKET, `keys/${body.address}.json`, data => {
    if(!('nonces' in data))
      data.nonces = [];
    if(!('keys' in data))
      data.keys = [];
    if(data.nonces.includes(body.nonce))
      throw new Error('duplicate_nonce');

    data.nonces.push(body.nonce);

    for(let i = 0; i<data.keys.length; i++) {
      // XXX: Could potentially remove all keys with a zero-length keyToRemove
      if(data.keys[i].secret.endsWith(body.keyToRemove.slice(-CENSOR_LEN))) {
        fullKey = data.keys[i].secret;
        data.keys[i].inactive = true;
      }
    }

    if(!fullKey) throw new Error('invalid_key_to_remove');
    output = data.keys.filter(item => !item.inactive).map(item => ({
      ...item,
      secret: censorApiKey(item.secret),
    }));

    return data;
  });

  await transformS3Json(process.env.APIKEY_BUCKET, `uses/${fullKey}.json`, data => {
    data.inactive = true;
    return data;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
      output,
    }),
  };
}

export async function generateApiKey(body) {
  await verifySignature(body, 'Generate New API Key');

  // skip recaptcha checking if secret key is set to disable
  if(process.env.RECAPTCHA_SECRET_KEY) {
    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: body.captchaToken,
    });

    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        body: params,
      });
      const data = await response.json();
      if(!data.success) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: 'CAPTCHA verification failed.',
            errors: data['error-codes']
          })
        };
      }
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: 'An error occurred during CAPTCHA verification.',
          error: error.message
        })
      };
    }
  } else {
    console.log('RECAPTCHA_SECRET_KEY not set. Skipping captcha verification!');
  }

  let output;
  const newKey = {
    created: Date.now(),
    secret: randomBytes(16).toString('hex'),
  };
  await transformS3Json(process.env.APIKEY_BUCKET, `keys/${body.address}.json`, data => {
    if(!('nonces' in data))
      data.nonces = [];
    if(!('keys' in data))
      data.keys = [];
    if(data.nonces.includes(body.nonce))
      throw new Error('duplicate_nonce');

    data.nonces.push(body.nonce);

    output = data.keys.filter(item => !item.inactive).map(item => ({
      ...item,
      secret: censorApiKey(item.secret),
    }));

    data.keys.push(newKey);
    output.push(newKey);

    return data;
  });

  await transformS3Json(process.env.APIKEY_BUCKET, `uses/${newKey.secret}.json`, data => {
    if('address' in data)
      throw new Error('duplicate_key');
    if(data.inactive)
      throw new Error('inactive_key');

    data.address = body.address;
    data.requests = [];
    return data;
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
      output,
    }),
  };
};

async function verifySignature(body, header) {
  const valid = await verifyMessage({
    address: body.address,
    message: `${header}\n\n${body.nonce}`,
    signature: body.signature,
  });
  if(!valid) throw new Error('invalid_signature');
}

function censorApiKey(apiKey) {
  if (apiKey.length <= CENSOR_LEN) {
    return apiKey;
  }
  return 'x'.repeat(apiKey.length - CENSOR_LEN) + apiKey.slice(-CENSOR_LEN);
}

import {verifyCircom} from './verifyCircom.js';
import {generateApiKey, removeApiKey, listApiKey} from './apiKeys.js';
import {updateP0tion} from './p0tion.js';

export async function handler(event) {
  // Triggered by timer
  if(event.source === 'aws.events') {
    await updateP0tion();
    return;
  }

  if('body' in event) {
    // Running on AWS
    event = JSON.parse(event.body);
  }
  try {
    switch(event.payload.action) {
      case 'verifyCircom':
        return await verifyCircom(event);
      case 'listApiKey':
        return await listApiKey(event);
      case 'removeApiKey':
        return await removeApiKey(event);
      case 'generateApiKey':
        return await generateApiKey(event);
      default:
        throw new Error('invalid_command');
    }
  } catch(error) {
    console.error(error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        errorType: 'error',
        errorMessage: error.message
      }),
    };
  }
}

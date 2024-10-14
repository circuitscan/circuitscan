import {verifyCircom} from './verifyCircom.js';
import {verifyCircomMulti} from './verifyCircomMulti.js';
import {verifyNoir} from './verifyNoir.js';
import {generateApiKey, removeApiKey, listApiKey} from './apiKeys.js';
import {storeSolcOutput, storeDeployedAddress} from './browserDeploy.js';
import {storeGithubHash} from './githubLink.js';
import {insertDirectoryContract} from './directory.js';
import {updateP0tion} from './p0tion.js';
import {retireNonResponding} from './retireNonResponding.js';

export async function handler(event) {
  // Triggered by timer
  if(event.source === 'aws.events') {
    await Promise.allSettled([
      updateP0tion(),
      retireNonResponding(),
    ]);
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
      case 'verifyCircomMulti':
        return await verifyCircomMulti(event);
      case 'verifyNoir':
        return await verifyNoir(event);
      case 'listApiKey':
        return await listApiKey(event);
      case 'removeApiKey':
        return await removeApiKey(event);
      case 'generateApiKey':
        return await generateApiKey(event);
      case 'storeSolcOutput':
        return await storeSolcOutput(event);
      case 'storeDeployedAddress':
        return await storeDeployedAddress(event);
      case 'storeGithubHash':
        return await storeGithubHash(event);
      case 'insertDirectoryContract':
        return await insertDirectoryContract(event);
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

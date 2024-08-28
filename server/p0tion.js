import {
  collection,
  getDoc,
  getDocs,
  getFirestore,
  terminate,
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

import {transformS3Json} from './utils.js';

const awsRegion = process.env.P0TION_AWS_REGION;
const bucketPostfix = process.env.P0TION_CONFIG_CEREMONY_BUCKET_POSTFIX;

export async function updateP0tion() {
  const app = initializeApp({
    apiKey: process.env.P0TION_FIREBASE_API_KEY,
    authDomain: process.env.P0TION_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.P0TION_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.P0TION_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.P0TION_FIREBASE_APP_ID,
  });

  const db = getFirestore(app);

  let terminatePromise;
  // TODO store urls and setups in separate files in order to reduce client data transfer
  await transformS3Json(process.env.ASSOC_BUCKET, `p0tion.json`, async (data) => {
    // Initialize new file if necessary
    data.ceremonies = data.cermonies || [];
    data.zkeys = data.zkeys || {};

    const newCeremonies = [];
    const newZkeys = [];
    // Get list of ceremonies
    const ceremonyQuery = await getDocs(collection(db, `ceremonies`));

    // If there's any new FINALIZED ceremonies, get all their circuit prefixes
    ceremonyQuery.forEach(ceremony => {
      const { state, prefix, title } = ceremony.data();
      if(state === 'FINALIZED') {
        const exists = data.ceremonies.findIndex(item => item.id === ceremony.id) !== -1;
        if(!exists) {
          newCeremonies.push({
            id: ceremony.id,
            prefix,
            title,
            circuits: [],
          });
        }
      }
    });

    // Compile the list of possible final zkey urls
    for(let i = 0; i < newCeremonies.length; i++) {
    //   if(i !== 0) break;
      const circuitQuery = await getDocs(collection(db, `ceremonies/${newCeremonies[i].id}/circuits`));
      circuitQuery.forEach(circuit => {
        const { prefix } = circuit.data();
        newCeremonies[i].circuits.push(prefix);
        newZkeys.push({
          url: `https://${newCeremonies[i].prefix}${bucketPostfix}.s3.${awsRegion}.amazonaws.com/circuits/${prefix}/contributions/${prefix}_final.zkey`,
          title: newCeremonies[i].title,
        })
      });
    }
    terminatePromise = terminate(db);

    // Merge new values in output
    for(let newCeremony of newCeremonies) {
      data.ceremonies.push(newCeremony);
    }
    for(let newZkey of newZkeys) {
      data.zkeys[newZkey.url] = newZkey.title;
    }
    return data;
  });

  // Terminating can take some time so only wait for it at the very end
  await terminatePromise;

}


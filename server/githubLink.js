import {createHash} from 'node:crypto';

import {diffTrimmedLines} from 'diff';

import {transformS3Json} from './utils.js';

const INCLUDE_REGEX = /^include "[^"]+";\n$/gm;
const MAIN_COMPONENT_REGEX = /component\s+main\s*(\{\s*public\s*\[\s*([^\]]*)\s*\]\s*\})?\s*=\s*([a-zA-Z0-9_]+)\(([^)]*)\);/;

export async function storeGithubHash(body) {
  const rawUrl = transformGithubUrlToRaw(body.payload.url);
  if(!rawUrl) return {
    statusCode: 400,
    body: JSON.stringify({
      errorType: 'bad_request',
      errorMessage: 'Invalid github blob url',
    }),
  };
  const resp = await fetch(rawUrl);
  const code = await resp.text();
  if(!acceptableDiff(code, body.payload.code)) return {
    statusCode: 400,
    body: JSON.stringify({
      errorType: 'bad_request',
      errorMessage: 'Not a valid source match',
    }),
  };
  const hash = createHash('sha256').update(body.payload.code).digest('hex');

  try {
    await transformS3Json(process.env.ASSOC_BUCKET, `github-hash/${hash}.json`, data => {
      if(!('links' in data)) data.links = [];
      if(data.links.includes(body.payload.url)) throw new DuplicateLinkError;
      data.links.push(body.payload.url);
      return data;
    });
  } catch(error) {
    if(error instanceof DuplicateLinkError) return {
      statusCode: 400,
      body: JSON.stringify({
        errorType: 'bad_request',
        errorMessage: 'Duplicate link submitted',
      }),
    };
    // Otherwise...
    throw error;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
      hash,
    }),
  };
}

class DuplicateLinkError extends Error {}

function acceptableDiff(sourceA, sourceB) {
  const diff = diffTrimmedLines(sourceA, sourceB, {
    stripTrailingCr: true,
  });

  let lastRemoved = null;
  for(let i = 0; i < diff.length; i++) {
    if(diff[i].removed) {
      if(lastRemoved !== null) {
        // Changes acceptableDiff below
        console.log('removed_after_another_removal', i);
        return false;
      }
      lastRemoved = i;
    } else if(lastRemoved === null
      && diff[i].added
      // Added whitespace is fine
      && diff[i].value.trim() !== ''
    ) {
      // Otherise, anything else added is invalid
      console.log('invalid_addition', i);
      return false;
    } else if(lastRemoved === i - 1 && diff[i].added) {
      lastRemoved = null;
      const mainCompMatch = diff[i-1].value.match(MAIN_COMPONENT_REGEX);
      // Allow only whitespace differences
      if(diff[i-1].value.trim() !== diff[i].value.trim()
        && !(diff[i-1].value.match(INCLUDE_REGEX)
        // Allow includes to be different paths (circuitscan rewrites the paths)
          && diff[i].value.match(INCLUDE_REGEX))
        // Allow the main component to be missing
        && !(mainCompMatch
          && diff[i-1].value.replace(mainCompMatch[0], '').trim() === diff[i].value.trim())
      ) {
        console.log('invalid_change', i);
        return false;
      }
    } else if(lastRemoved !== null && diff[i].added) {
      console.log('invalid_removal', i);
      return false;
    }
  }
  if(lastRemoved !== null) {
    const mainCompMatch = diff[lastRemoved].value.match(MAIN_COMPONENT_REGEX);
    if(mainCompMatch && diff[lastRemoved].value.replaceAll(mainCompMatch[0], '').trim() === '') {
      // The main component was removed at the end of the file
      return true;
    }
    console.log('invalid_unbalanced_removal', lastRemoved)
    return false;
  }
  return true;
}

function transformGithubUrlToRaw(url) {
    const regex = /^https:\/\/github\.com\/([\w-]+\/[\w-]+)\/blob\/([a-f0-9]{40})\/(.+)$/;

    const match = url.match(regex);

    if (match) {
        // Construct the raw URL using the captured groups from the regex
        const repository = match[1];    // The user/organization and repository name
        const commitHash = match[2];    // The commit hash
        const filePath = match[3];      // The file path

        return `https://github.com/${repository}/raw/${commitHash}/${filePath}`;
    } else {
        return null;  // Return null if the URL is not valid
    }
}


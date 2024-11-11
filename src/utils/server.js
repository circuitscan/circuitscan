export const statusFetch = instanceDataFetch.bind(null, 'status');
const healthcheckFetch = instanceDataFetch.bind(null, 'healthcheck');
// TODO terminate is not actually required but the CLI doesn't send any action
export const terminateInstance = instanceDataFetch.bind(null, 'terminate');

async function instanceDataFetch(action, requestId, apiKey) {
  const event = {payload: {requestId, action}, apiKey};
  const response = await fetch(import.meta.env.VITE_HEALTHCHECK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!response.ok && response.status !== 400) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  const body = 'body' in data ? JSON.parse(data.body) : data;
  if(!response.ok)
    throw new Error(body.errorMessage);
  return body;
}

export function watchInstance(requestId, apiKey, setInstanceStatus, timeout) {
  return new Promise((resolve, reject) => {
    let ip, healthcheckInterval;
    const interval = setInterval(async () => {
      try {
        if(!ip) {
          ip = (await fetchResult(requestId, 'ip')).trim();
          setInstanceStatus(`Instance running at ${ip}...`);
          healthcheckInterval = setInterval(async () => {
            try {
              await healthcheckFetch(requestId, apiKey);
            } catch(error) {
              if(error.message === 'healthcheck_timeout') {
                // Instance is not responding
                setInstanceStatus({
                  error: true,
                  msg: 'Instance health check failed, terminating!\n' +
                       'Possible out-of-memory exception. Try a larger instance size.',
                });

                try {
                  const response = await terminateInstance(requestId, apiKey);
                  if(response.status !== 'ok') {
                    console.error(response);
                  }
                } catch(error) {
                  // Not a big deal, just display it
                  console.error(error);
                }
              }
              clearInterval(interval);
              clearInterval(healthcheckInterval);
              reject(error);
            }
          }, timeout);
        }
        const stderr = await fetchResult(requestId, 'stderr');
        const stdout = await fetchResult(requestId, 'stderr');
        clearInterval(interval);
        clearInterval(healthcheckInterval);
        resolve({ stderr, stdout });
      } catch(error) {
        if(!(error instanceof NotFoundError)) {
          clearInterval(interval);
          clearInterval(healthcheckInterval);
          reject(error);
        }
      }
    }, timeout);
  });
}

async function fetchResult(requestId, pipename) {
  const response = await fetch(`${import.meta.env.VITE_BLOB_URL}instance/${requestId}/${pipename}.txt`);
  if (!response.ok) {
    if (response.status === 404 || response.status === 403) {
      throw new NotFoundError;
    } else {
      console.log(response);
      throw new Error('Error while checking instance state');
    }
  }
  const data = await response.text();
  return data;
}

class NotFoundError extends Error {}
class TimeoutError extends Error {}


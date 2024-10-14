import { EC2Client, TerminateInstancesCommand, DescribeInstancesCommand } from '@aws-sdk/client-ec2';

const ec2Client = new EC2Client();

const TIMEOUT = 7000;
const MIN_RETIRE_TIME_MS = 5 * 60 * 1000; // 5 minutes

export async function retireNonResponding() {
  const response = await ec2Client.send(new DescribeInstancesCommand({
    Filters: [
      {
        Name: 'instance-state-name',
        Values: ['running']
      }
    ]
  }));

  const instances = response.Reservations.map(reservation => reservation.Instances).flat();
  const healthchecks = [];
  for(let instance of instances) {
    if(Date.now() - (new Date(instance.LaunchTime)).getTime() > MIN_RETIRE_TIME_MS) {
      healthchecks.push(healthcheckFetch(instance.PublicIpAddress, TIMEOUT));
    }
  }

  const results = await Promise.allSettled(healthchecks);
  const idsToTerminate = [];
  for(let i=0; i<results.length; i++) {
    const result = results[i];
    if(result.reason instanceof TimeoutError) {
      console.log('Terminating hung instance: ', instances[i].InstanceId);
      idsToTerminate.push(instances[i].InstanceId);
    }
  }

  if(idsToTerminate.length > 0) {
    await ec2Client.send(new TerminateInstancesCommand({
      InstanceIds: idsToTerminate,
    }));
  }
}

function healthcheckFetch(ip, timeout) {
  const controller = new AbortController();
  const signal = controller.signal;

  const timeoutPromise = new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError());
    }, timeout);
  });

  const fetchPromise = fetch(`http://${ip}:3000`, { signal });

  return Promise.race([fetchPromise, timeoutPromise]);
}

class TimeoutError extends Error {}


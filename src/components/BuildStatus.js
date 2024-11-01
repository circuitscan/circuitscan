import { useEffect, useState } from 'react';
import Convert from 'ansi-to-html';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  ArrowPathIcon,
} from '@heroicons/react/24/solid';

import Card from './Card.js';
import CodeBlock from './CodeBlock.js';
import {clsIconA} from './Layout.js';
import useDarkMode from './useDarkMode.js';
import { formatDuration, formatBytes } from '../utils.js';

export function BuildStatus({
  requestId,
  isCircom,
  skipCard,
  renderOnComplete,
  customError,
  doRefresh,
}) {
  const darkMode = useDarkMode();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [complete, setComplete] = useState(false);
  const [refreshCounter, setStatusRefreshCounter] = useState(0);

  useEffect(() => {
    if(!doRefresh || !requestId) return;

    const intervalId = setInterval(() => {
      setStatusRefreshCounter((val) => val + 1);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [doRefresh, requestId]);

  useEffect(() => {
    setData(null);
    setComplete(false);
  }, [requestId]);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetch(`${import.meta.env.VITE_BLOB_URL}status/${requestId}.json`, {
          cache: refreshCounter ? 'reload' : undefined
        });
        const data = await result.json();
        if(data.find(x => x.msg === 'Complete.')) setComplete(true);
        const convert = new Convert();
        if(isCircom) {
          setData({
            raw: data,
            shell: convert.toHtml(data
              .filter(x => x.msg !== 'Memory Usage Update' && x.msg !== 'Circom memory usage')
              .map(x => x.msg.startsWith('Circomkit') ? x.data.msg : x.msg)
              .join('\n\n')),
            duration: data[data.length - 1].time.toFixed(2),
            memory: data
              .filter(x => ['Circom memory usage', 'Memory Usage Update'].indexOf(x.msg) !== -1)
              .map(x => ({
                memory: typeof x.data.memoryUsage !== 'undefined' ? x.data.memoryUsage * 1024 :
                  typeof x.data.memory !== 'undefined' ? x.data.memory.rss : 0,
                disk: x.data.disk ? Number((
                  x.data.disk.find(x => x.Mounted === '/tmp')
                  // Some compiles won't have a specific /tmp mount
                  || x.data.disk.find(x => x.Mounted === '/')).Used) * 1024 : 0,
                time: x.time,
              }))
              .reduce((out, cur, index) => {
                const lastItem = out[out.length - 1];
                if(index > 0 && cur.disk === 0 && lastItem.disk > 0) {
                  // Add Circom memory usage to the other memory value if they're interleaved
                  lastItem.memory += cur.memory;
                } else {
                  out.push(cur);
                }
                return out;
              }, []),
          });
        } else {
          setData({
            raw: data,
            shell: convert.toHtml(data.map(x => x.msg).join('\n\n')),
            memory: [],
            duration: data[data.length - 1].time.toFixed(2),
          });
        }
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    requestId && loadAsyncData();
  }, [requestId, refreshCounter]);

  const rendered = (<>
    {doRefresh && <button
      onClick={() => setStatusRefreshCounter(refreshCounter + 1)}
      className={`${clsIconA} flex inline-block mt-2 leading-4`}
    >
      <ArrowPathIcon className={`${loading ? 'animate-spin' :''} h-4 w-4 mr-1`} />
      Refresh
    </button>}
    {loading && !data && <p className="my-4">Loading build status...</p>}
    {error && (customError || <p className="my-4 text-red-500">Error loading build status!</p>)}
    {data && <>
      {complete && renderOnComplete && renderOnComplete(data)}
      {data.memory.length > 0 && <>
        <p className="text-l font-bold">Compilation Duration: {formatDuration(data.duration)}</p>
        <LineChart
          xAxis={[
            {
              dataKey: 'time',
              valueFormatter: (value) => formatDuration(value),
            },
          ]}
          yAxis={[
            {
              valueFormatter: (value) => formatBytes(value),
            },
          ]}
          margin={{ top: 20, right: 20, bottom: 40, left: 70 }}
          slotProps={{
            legend: {
              direction: 'row',
              position: { vertical: 'top', horizontal: 'right' },
              padding: 0,
              labelStyle: {
                fill: darkMode ? '#eee' : '#000',
              }
            },
          }}
          series={[
            {
              dataKey: 'memory',
              label: 'Memory',
              valueFormatter: (value) => `Memory: ${formatBytes(value)}`,
            },
            {
              dataKey: 'disk',
              label: 'Disk',
              valueFormatter: (value) => `Disk: ${formatBytes(value)}`,
            },
          ]}
          height={300}
          dataset={data.memory}
          />
        </>}
      <pre
        className={`
          max-w-full overflow-x-auto
          language-shell
        `}
        dangerouslySetInnerHTML={{ __html: data.shell }}
        />
    </>}
  </>);
  if(skipCard) return rendered;
  return (<Card fullWidth={!!data}>{rendered}</Card>);
}

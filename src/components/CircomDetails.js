import { useEffect, useState } from 'react';
import {
  CheckIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import {
  joinPaths,
  getImports,
  extractCircomTemplate,
  loadListOrFile,
  p0tionDetails,
} from '../utils.js';

import {clsIconA} from './Layout.js';
import Card from './Card.js';
import {SourceTree} from './SourceTree.js';
import {ProofMaker} from './ProofMaker.js';
import {BuildStatus} from './BuildStatus.js';
import Tabs from './Tabs.js';
import {PopupDialog} from './PopupDialog.js';

export function CircomDetails({ info, pkgName, chainParam, address }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Find the template in the sources somewhere
        let tryFiles = [ info.circuit.file + '.circom' ];
        let source, template, i = 0;
        const sources = [];
        while(!template) {
          const tryFile = tryFiles[i++];
          if(!tryFile) throw new Error('Template not found!');
          source = await loadListOrFile(`build/${pkgName}/source.zip`, tryFile);
          sources.push(source);
          template = extractCircomTemplate(sources, info.circuit.template);
          if(!template) {
            const imports = getImports(source).map(path => joinPaths(tryFile, path));
            // Filter through a Set to prevent infinite loops
            tryFiles = [...new Set([ ...tryFiles, ...imports ])];
          }
        }
        setData(template);
      } catch (error) {
        console.error(error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, [info, chainParam]);

  // TODO display optimization level
  return (<>
    {loading ? <Card>Loading circuit details...</Card> :
      error ? <Card>Error loading circuit details!</Card> :
      data && <div>

      <div className="flex flex-col sm:flex-row">
        <Card fullWidth={true}>
          <dl>
            <dt className="text-l font-bold">Compiler</dt>
            <dd className="pl-6">{info.circomPath}</dd>
            <dt className="text-l font-bold">Protocol</dt>
            <dd className="pl-6 flex items-center">
              <span>{info.protocol}</span>
              {info.protocol === 'groth16' && <ZkeyStatus finalZKey={info.finalZKey} />}
            </dd>
            {info.ptau && <>
              <dt className="text-l font-bold">PTAU</dt>
              <dd className="pl-6">{isNaN(info.ptau) ?
                <a
                  href={info.ptau}
                  target="_blank"
                  rel="noopener"
                  className={clsIconA}
                >
                  {(new URL(info.ptau)).pathname.split('/').pop()}
                </a>
                : info.ptau
              }</dd>
            </>}
            <dt className="text-l font-bold">SnarkJS Version</dt>
            <dd className="pl-6">{info.snarkjsVersion}</dd>
            <dt className="text-l font-bold">Template</dt>
            <dd className="pl-6">{info.circuit.template}</dd>
            <dt className="text-l font-bold">Params</dt>
            <dd className="pl-6">{info.circuit.params && info.circuit.params.length > 0
              ? info.circuit.params.map((val, index) => <p key={index}>
                <code>{data.parameters[index]}</code>: {val}
              </p>)
              : <span className="italic">None</span>
            }</dd>
            <dt className="text-l font-bold">Pubs</dt>
            <dd className="pl-6">{info.circuit.pubs && info.circuit.pubs.length > 0
              ? info.circuit.pubs.join(', ')
              : <span className="italic">None</span>
            }</dd>
          </dl>
          <PopupDialog
            linkText="View full details..."
            linkClass="mt-4"
          >
            <pre className="overflow-x-auto language-json">
              {JSON.stringify(info, null, 2)}
            </pre>
          </PopupDialog>
        </Card>
        <Card fullWidth={true}>
          <ProofMaker
            template={data}
            {...{info, pkgName, chainParam, address}}
          />
        </Card>
      </div>

      <Tabs tabs={{
        'Source Code': () =>
          <SourceTree
            {...{pkgName}}
            rootFile={info.circuit.file + '.circom'}
            sourceSize={info.sourceSize}
            showCircomspect={true}
          />,
        'Build Output': () =>
          <BuildStatus
            requestId={info.requestId}
            isCircom={true}
          />,
      }} />
    </div>}
  </>);
}

function ZkeyStatus({ finalZKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        setData(await p0tionDetails(finalZKey));
      } catch (error) {
        console.error(error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    (typeof finalZKey === 'string') && finalZKey.startsWith('https://') && loadAsyncData();
  }, []);

  if(!finalZKey) return <div className={`
      flex pl-2 pr-3 py-1 ml-2
      border rounded-full bg-neutral-200 dark:bg-neutral-900
      border-neutral-400 dark:border-neutral-600
      text-sm
    `}>
      <CheckIcon className="h-5 w-5 text-gray-500" />&nbsp;
      Circuitscan Random Entropy Setup
    </div>;
  if(loading) return <div className={`
      flex pl-2 pr-3 py-1 ml-2
      border rounded-full bg-neutral-200 dark:bg-neutral-900
      border-neutral-400 dark:border-neutral-600
      text-sm
    `}>
      <ClockIcon className="h-5 w-5 text-blue-500" />&nbsp;
      Loading Second Phase Setup...
    </div>;
  if(error) return <div className={`
      flex pl-2 pr-3 py-1 ml-2
      border rounded-full bg-neutral-200 dark:bg-neutral-900
      border-neutral-400 dark:border-neutral-600
      text-sm
    `}>
      <XMarkIcon className="h-5 w-5 text-red-500" />&nbsp;
      Error Loading Second Phase Setup
    </div>;
  if(!data) return <div className={`
      flex pl-2 pr-3 py-1 ml-2
      border rounded-full bg-neutral-200 dark:bg-neutral-900
      border-neutral-400 dark:border-neutral-600
      text-sm
    `}>
      <XMarkIcon className="h-5 w-5 text-red-500" />&nbsp;
      Unknown Second Phase Setup
    </div>;
  return <a
    href={`https://ceremony.pse.dev/projects/${data}`}
    target="_blank"
    rel="noopener"
    title="View Trusted Setup Details..."
    className={`
      flex pl-2 pr-3 py-1 ml-2
      border rounded-full bg-neutral-200 dark:bg-neutral-900
      border-neutral-400 dark:border-neutral-600
      text-sm
    `}
   >
     <CheckIcon className="h-5 w-5 text-green-500" />&nbsp;
     Trusted Setup Verified
   </a>;
}

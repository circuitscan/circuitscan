import { useEffect, useState } from 'react';

import {
  joinPaths,
  getImports,
  extractCircomTemplate,
  loadListOrFile,
} from '../utils.js';

import Card from './Card.js';
import {SourceTree} from './SourceTree.js';
import {ProofMaker} from './ProofMaker.js';
import {BuildStatus} from './BuildStatus.js';
import Tabs from './Tabs.js';

export function CircomDetails({ info, pkgName, chainParam, address }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        // Find the template in the sources somewhere
        let tryFiles = [ info.circuit.file + '.circom' ];
        let source, template, i = 0;
        while(!template) {
          const tryFile = tryFiles[i++];
          if(!tryFile) throw new Error('Template not found!');
          source = await loadListOrFile(`build/${pkgName}/source.zip`, tryFile);
          template = extractCircomTemplate(source, info.circuit.template);
          if(!template) {
            const imports = getImports(source).map(path => joinPaths(tryFile, path));
            tryFiles = [ ...tryFiles, ...imports ];
          }
        }
        setData(template);
      } catch (err) {
        console.error(error);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, []);

  return (<>
    {loading && <Card>Loading circuit details...</Card>}
    {error && <Card>Error loading circuit details!</Card>}
    {data && <div>

      <div className="flex flex-col sm:flex-row">
        <Card fullWidth={true}>
          <dl>
            <dt className="text-l font-bold">Compiler</dt>
            <dd className="pl-6">{info.circomPath}</dd>
            <dt className="text-l font-bold">Protocol</dt>
            <dd className="pl-6">{info.protocol}</dd>
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
          />,
        'Build Output': () =>
          <BuildStatus
            requestId={info.requestId}
          />,
      }} />
    </div>}
  </>);
}

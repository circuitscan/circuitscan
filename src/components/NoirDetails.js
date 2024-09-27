import { useEffect, useState } from 'react';

import {clsIconA} from './Layout.js';
import Card from './Card.js';
import {SourceTree} from './SourceTree.js';
import {BuildStatus} from './BuildStatus.js';
import Tabs from './Tabs.js';

export function NoirDetails({ info, pkgName, chainParam, address }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        // Load data for the proof generator?
        setData(true);
      } catch (error) {
        console.error(error);
        setError(error);
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
            <dt className="text-l font-bold">Nargo Version</dt>
            <dd className="pl-6">{info.nargoVersion}</dd>
            <dt className="text-l font-bold">Barretenberg Version</dt>
            <dd className="pl-6">{info.bbVersion}</dd>
            <dt className="text-l font-bold">Name</dt>
            <dd className="pl-6">{info.nargoToml.package.name}</dd>
            <dt className="text-l font-bold">Authors</dt>
            <dd className="pl-6">{info.nargoToml.package.authors.join(', ')}</dd>
          </dl>
        </Card>
        <Card fullWidth={true}>
          NYI: Noir proof generator
        </Card>
      </div>

      <Tabs tabs={{
        'Source Code': () =>
          <SourceTree
            {...{pkgName}}
            rootFile={'src/main.nr'}
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



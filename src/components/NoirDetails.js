import { useEffect, useState } from 'react';

import {clsIconA} from './Layout.js';
import Card from './Card.js';
import {SourceTree} from './SourceTree.js';
import {BuildStatus} from './BuildStatus.js';
import {NoirProofMaker} from './NoirProofMaker.js';
import Tabs from './Tabs.js';
import {
  loadListOrFile,
} from '../utils.js';

export function NoirDetails({ info, pkgName, chainParam, address }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        setLoading(true);
        setError(null);
        const source = await loadListOrFile(`build/${pkgName}/source.zip`, 'src/main.nr');
        const mainArgs = extractMainArguments(source);
        setData(mainArgs);
      } catch (error) {
        console.error(error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, [info, chainParam]);

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
          <NoirProofMaker
            mainArgs={data}
            {...{info, pkgName, chainParam, address}}
          />
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

function extractMainArguments(sourceCode) {
    // Step 1: Match the function signature of the main function using regex
    const mainFunctionRegex = /fn\s+main\s*\(([^)]*)\)/;
    const match = sourceCode.match(mainFunctionRegex);

    // Step 2: If no match found, return an empty array
    if (!match) {
        return [];
    }

    // Step 3: Extract the argument part inside the parentheses
    const argsString = match[1].trim();

    // Step 4: Split the arguments by comma to get each argument string
    const argsArray = argsString.split(',').map(arg => arg.trim());

    // Step 5: Extract argument names and check if they are public
    const argInfo = argsArray.map(arg => {
        // Separate name and type (and check for 'pub' in the type)
        const [name, type] = arg.split(':').map(part => part.trim());

        // Check if the type contains 'pub'
        const isPublic = type.startsWith('pub');

        return {
            name,
            isPublic
        };
    });

    return argInfo;
}

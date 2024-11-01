import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { toast } from 'react-hot-toast';
import {
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import toml from 'toml';

import {
  joinPaths,
  getImports,
} from '../utils.js';
import {clsButton, clsInput, clsIconA} from '../components/Layout.js';

const BB_VERSIONS = {
  "0.34.0": "0.55.0",
  "0.33.0": "0.47.1",
  "0.32.0": "0.46.1",
  "0.31.0": "0.41.0",
};

export function CircuitName({circuit}) {
  return (
    <span>{circuit.parsedToml.package.name} (noir)</span>
  );
}

export const Options = forwardRef(function({circuit, zipContents}, payloadRef) {
  const [nargoVersion, setNargoVersion] = useState(Object.keys(BB_VERSIONS)[0]);

  useImperativeHandle(payloadRef, () => ({
    serializeState: () => ({
      pipeline: 'noir',
      files: circuit.files,
      nargoToml: circuit.nargoToml,
      nargoVersion,
      bbupVersion: BB_VERSIONS[nargoVersion],
    }),
  }));

  return (<>
    <label className="block">
      <span>Nargo Version:</span>
      <select
        value={nargoVersion}
        onChange={(e) => setNargoVersion(e.target.value)}
        className={`${clsInput}`}
      >
        {Object.keys(BB_VERSIONS).map((version, index) =>
          <option key={version} value={version}>{version}</option>)}
      </select>
    </label>
  </>);
});

export function parse(fileContent, filename, zipContents) {
  if(filename.endsWith('Nargo.toml')) {
    const rootPath = filename.slice(0, -10);
    return {
      type: 'noir',
      files: Object.entries(zipContents)
        .filter(entry => entry[0].startsWith(rootPath) && entry[0].endsWith('.nr'))
        .map(entry => ({
          filename: entry[0].slice(rootPath.length),
          content: entry[1],
        })),
      nargoToml: fileContent,
      parsedToml: toml.parse(fileContent),
    };
  }
}


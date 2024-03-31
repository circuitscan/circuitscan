import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'

function UploadCode({ dataState, filepath, includepath, bundleState }) {
  // State to store the file content
  const [fileContent, setFileContent] = useState('');
  const [selectedName, setSelectedName] = useState();
  const [importFilenames, setImportFilenames] = useState();

  const filename = filepath && filepath.split('/').at(-1);
  const inState =
    (filename in dataState[0] && dataState[0][filename].code !== null)
    || fileContent;
  includepath = includepath || '';

  useEffect(() => {
    // Only the root has bundleState
    if(bundleState) {
      const allLoaded = Object.keys(dataState[0]).reduce((prev, cur) => {
        if(prev !== false && dataState[0][cur].code !== null) return true;
        return false;
      }, null);
      if(allLoaded) {
        bundleState[1](selectedName);
      } else {
        bundleState[1](false);
      }
    }
  }, [dataState[0]]);

  // Function to handle file selection and reading
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setSelectedName(null);
      return;
    }
    setSelectedName(file.name);

    const reader = new FileReader();

    // When the file is successfully read, update the state with its content
    reader.onload = (e) => {
      setFileContent(e.target.result);
      const imports = Array.from(e.target.result.matchAll(/include "([^"]+)";/g));

      const templates = Array.from(e.target.result.matchAll(/template ([^\(]+)/g));
      setImportFilenames(imports.map((match) => match[1]));
      dataState[1](state => {
        const out = {};
        // When a new root file is loaded, don't append last state
        if(!bundleState) {
          Object.assign(out, state);
        }
        const name = filename || file.name;
        out[name] = {
          code: e.target.result,
          includepath,
          templates: templates.map(tpl => tpl[1]),
        };
        for(let match of imports) {
          const name = match[1].split('/').at(-1);
          if(!(name in state)) {
            out[name] = { code: null };
          }
        }
        return out;
      });
    };

    // Read the file as a text
    reader.readAsText(file);
  };

  if(filename
    && inState
    && dataState[0][filename]
    && dataState[0][filename].includepath !== includepath
  ) {
    return (
      <div className="flex">
        <CheckIcon className="h-6 w-6 text-blue-500" />
        <span>{filepath}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex">
        {inState
          ? <CheckIcon className="h-6 w-6 text-blue-500" />
          : <XMarkIcon className="h-6 w-6 text-red-500" />}
        <span>{filepath}</span>
        <input type="file" onChange={handleFileChange} />
      </div>
      {importFilenames && !!importFilenames.length && <>
        <ul className="ml-6">
          {importFilenames.map((path, index) =>
            <li key={index}>
              <UploadCode
                {...{dataState}}
                includepath={`${includepath}:${index}`}
                filepath={path}
              />
            </li>
          )}
        </ul>
      </>}
    </div>
  );
}

export default UploadCode;


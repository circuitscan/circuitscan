import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'

function UploadCode({ dataState, filepath, includepath, bundleState, circomlib }) {
  // State to store the file content
  const [fileContent, setFileContent] = useState('');
  const [selectedName, setSelectedName] = useState();
  const [importFilenames, setImportFilenames] = useState();

  const filename = filepath && filepath.split('/').at(-1);
  const inState =
    (filename in dataState[0] && dataState[0][filename].code !== null)
    || !!fileContent;

  useEffect(() => {
    if(inState && !importFilenames && circomlib && (filename in circomlib)) {
      setImportFilenames(getImports(circomlib[filename]));
    }
  }, [filepath, circomlib, dataState[0]]);

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
      const imports = getImports(e.target.result);

      const templates = getTemplates(e.target.result);
      setImportFilenames(imports);
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
          templates,
        };
        Object.assign(out, processImports(out, imports, circomlib, includepath));
        return out;
      });
    };

    // Read the file as a text
    reader.readAsText(file);
  };

  // This filename has already been loaded, don't fall for circular refs!
  if(filename
    && inState
    && dataState[0][filename]
    && dataState[0][filename].includepath !== includepath
  ) {
    return (
      <div>
        <div className="flex">
          <CheckIcon className="h-6 w-6 text-blue-500" />
          <span>{filepath}</span>
        </div>
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
                {...{dataState, circomlib}}
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

function getImports(circomCode) {
  return Array.from(circomCode.matchAll(/include "([^"]+)";/g)).map(x=>x[1]);
}

function getTemplates(circomCode) {
  return Array.from(circomCode.matchAll(/template ([^\(]+)/g)).map(x=>x[1]);
}

function processImports(out, imports, circomlib, includepath) {
  for(let i = 0; i < imports.length; i++) {
    const match = imports[i];
    const name = match.split('/').at(-1);
    if(!(name in out)) {
      if(name in circomlib) {
        const childImports = getImports(circomlib[name]);
        out[name] = {
          code: circomlib[name],
          includepath: `${includepath}:${i}`,
          templates: getTemplates(circomlib[name]).map(tpl=>tpl[1]),
        };
        Object.assign(out, processImports(out, childImports, circomlib, includepath));
      } else {
        out[name] = { code: null };
      }
    }
  }
  return out;
}

import React, { useState, useEffect } from 'react';

import init, { analyze_code } from '../utils/circomspect_wasm.js';
import {clsButton, clsIconA} from './Layout.js';

import {
  loadListOrFile,
} from '../utils.js';

export function Circomspect({ pkgName, analyzedCode, setAnalyzedCode }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    setLoading(false);
  }, [pkgName]);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      // Load all sources
      const list = (await loadListOrFile(`build/${pkgName}/source.zip`))
        .filter(x => x.compressedSize > 0);
      const allTemplates = [];
      for(let i = 0; i < list.length; i++) {
        const file = list[i];
        const result = await loadListOrFile(`build/${pkgName}/source.zip`, file.fileName);
        file.content = result;
        const tplFull = extractTemplates(result);
        const tplNoComments = extractTemplates(removeComments(result));
        // Templates must have the comments to be found in the full source
        // but templates that are commented out fully should not be analyzed
        file.templates = tplFull.filter(tpl => tplNoComments.find(x => x.name === tpl.name));
        for(let j = 0; j < file.templates.length; j++) {
          const template = file.templates[j];
          template.index = allTemplates.length;
          template.pos = file.content.indexOf(template.body);
          template.reports = [];
          // Create a flat list of the templates to send to Circomspect
          allTemplates.push({
            fileIndex: i,
            templateIndex: j,
            body: template.body,
          });
        }
      }
      if(allTemplates.length) {
        await init('/circomspect_wasm_bg.wasm');
        // Perform the analyzation
        const raw = JSON.parse(analyze_code(allTemplates.map(x => x.body), 'BN254'));
        if(raw[1].length > 0) {
          console.log(raw);
          throw new Error('Circomspect parsing error!');
        }
        // Put the reports in the hierarchical list
        for(let report of raw[0]) {
          const [start,end] = report.primary.split(',').map(x => Number(x));
          report.start = start;
          report.end = end;
          if(report.primary_file_ids.length) {
            const fromAllTpl = allTemplates[report.primary_file_ids[0]];
            list[fromAllTpl.fileIndex].templates[fromAllTpl.templateIndex].reports.push(report);
          } else {
            console.log('Unbucketed analyzation report', report);
          }
        }
      }
      setAnalyzedCode(list);
    } catch(error) {
      console.error(error);
      setError(true);
    }
    setLoading(false);
  }

  if(error) return <span className="text-red-500">Error Analyzing Source!</span>;
  return (<div className="mb-3">
    <button
      className={`${clsButton} text-nowrap mb-0`}
      onClick={runAnalysis}
      disabled={loading || !!analyzedCode}
    >
      {loading ? 'Analyzing Sources...' : !!analyzedCode ? 'Sources Analyzed' : 'Analyze Circuit Source'}
    </button>
    <a
      href="https://github.com/trailofbits/circomspect"
      target="_blank"
      rel="noopener"
      className={`${clsIconA} px-2 text-sm inline-block text-nowrap opacity-50`}
    >Powered by Circomspect</a>
  </div>);
}

function removeComments(value) {
  return value.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
}

function extractTemplates(circomSource) {
    const templateRegex = /template\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{/g;
    let match;
    const templates = [];

    // Iterate through all matches for the beginning of a template
    while ((match = templateRegex.exec(circomSource)) !== null) {
        const templateName = match[1]; // Capturing the template name
        const startIndex = match.index; // Start index of the match
        let braceCount = 1; // We have found one opening brace '{'
        let currentIndex = match.index + match[0].length; // Set starting point after the matched template declaration

        // Traverse the source code and find the closing brace for the template
        while (braceCount > 0 && currentIndex < circomSource.length) {
            if (circomSource[currentIndex] === '{') {
                braceCount++; // Found an opening brace inside the template, increase counter
            } else if (circomSource[currentIndex] === '}') {
                braceCount--; // Found a closing brace, decrease counter
            }
            currentIndex++; // Move to the next character
        }

        // Extract the complete template including the "template" keyword and its body
        const templateBody = circomSource.substring(startIndex, currentIndex);

        templates.push({
            name: templateName,
            body: templateBody // Trim any extra whitespace
        });
    }

    return templates;
}

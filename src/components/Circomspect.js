import React, { useState, useEffect } from 'react';
import init, { analyze_code } from '../utils/circomspect_wasm.js';
import {clsButton} from './Layout.js';

export function Circomspect({ code, analyzedCode, setAnalyzedCode }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    setLoading(false);
  }, [code]);
  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const templates = extractTemplates(code);
      if(templates.length) {
        await init('/circomspect_wasm_bg.wasm');
        for(let i=0; i < templates.length; i++) {
          const template = templates[i];
          // TODO support other curves
          const result = analyze_code(template.body, 'BN254');
          template.result = JSON.parse(result).map(item => {
            const [start,end] = item.primary.split(',').map(x => Number(x));
            item.start = start;
            item.end = end;
            return item;
          });
          template.pos = code.indexOf(template.body);
        }
        setAnalyzedCode(templates);
      }
    } catch(error) {
      console.error(error);
      setError(true);
    }
    setLoading(false);
  }

  if(error) return <span className="text-red-500">Error Analyzing Source!</span>;
  return (<>
    <button
      className={`${clsButton}`}
      onClick={runAnalysis}
      disabled={loading || !!analyzedCode}
    >
      Analyze Circuit Source
    </button>
  </>);
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

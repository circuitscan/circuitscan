import React, { useEffect } from 'react';
import Prism from 'prismjs';
import prismLineNumbers from '../utils/prism-line-numbers.js';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

const CodeBlock = ({ code, language }) => {
  useEffect(() => {
    prismLineNumbers(Prism);
    Prism.highlightAll();
  }, [code, language]);

  return (
    <pre
      className="line-numbers overflow-x-auto w-full bg-slate-100 dark:bg-slate-900 dark:text-white"
    >
      <code className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
};

export default CodeBlock;

import React, { useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-solidity';

const CodeBlock = ({ code, language }) => {
  useEffect(() => {
    Prism.highlightAll();
  }, [code, language]);

  return (
    <pre
      className="line-numbers overflow-auto w-full h-96 bg-slate-100 dark:bg-slate-900 dark:text-white"
    >
      <code className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
};

export default CodeBlock;

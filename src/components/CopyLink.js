import React, { useState } from 'react';
import { DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline';
import {
  setClipboard,
} from '../utils.js';

const CopyLink = ({ text, hideText, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Revert to clipboard icon after 2 seconds
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className={`flex items-center space-x-2 hover:underline ${className}`}
    >
      {!hideText && <span>{text}</span>}
      {copied ? (
        <CheckIcon className="h-5 w-5 text-green-500" />
      ) : (
        <DocumentDuplicateIcon className="h-5 w-5 text-gray-500" />
      )}
    </button>
  );
};

export default CopyLink;

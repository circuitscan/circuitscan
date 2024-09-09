import React, { useState, useEffect } from 'react';
import Prism from 'prismjs';
import { toast } from 'react-hot-toast';

import prismLineNumbers from '../utils/prism-line-numbers.js';
import {generateSHA256Hash} from '../utils.js';
import {clsButton, clsInput, clsIconA} from './Layout.js';

const CodeBlock = ({ code, language }) => {
  useEffect(() => {
    prismLineNumbers(Prism);
    Prism.highlightAll();
  }, [code, language]);

  return (<>
    <GithubLink {...{code}} />
    <pre
      className="line-numbers overflow-x-auto w-full bg-slate-100 dark:bg-slate-900 dark:text-white"
    >
      <code className={`language-${language}`}>
        {code}
      </code>
    </pre>
  </>);
};

export default CodeBlock;

function GithubLink({ code }) {
  const [hash, setHash] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const loadAsyncData = async () => {
      setLoading(true);
      setData(null);
      setHash(null);
      setError(null);
      try {
        const hash = await generateSHA256Hash(code);
        setHash(hash);
        const result = await fetch(`${import.meta.env.VITE_BLOB_URL}github-hash/${hash}.json`);
        const data = await result.json();
        setData(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    code && code !== 'Loading...' && loadAsyncData();
  }, [code, reloadCount]);

  if(loading || code === 'Loading...') return(<>
    <p>Loading Github sources...</p>
  </>);

  if(error) return (<>
    <div>
      No Github sources for this file.
      {hash && <SubmitGithubLink {...{hash, code, setReloadCount}} />}
    </div>
  </>);

  if(data) return (<>
    <div>Github match{data.links.length > 1 ? 'es' : ''}:
      {data.links.map(link => <a
          href={link}
          key={link}
          className={`${clsIconA} text-nowrap ${data.links.length > 1 ? 'block' : 'inline-block'} px-2`}
          target="_blank"
          rel="noopener"
          title=""
        >{getGithubUrlDetails(link)}</a>)}
      {hash && <SubmitGithubLink {...{hash, code, setReloadCount}} />}
    </div>
  </>);
}

function getGithubUrlDetails(url) {
    const regex = /^https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/blob\/([a-f0-9]{40})\/.+$/;
    const match = url.match(regex);

    if (match) {
        const username = match[1];
        const repo = match[2];
        const commitHash = match[3].slice(0, 7);  // Shorten the commit hash to the first 7 characters

        return `${username}/${repo}#${commitHash}`;
    } else {
        return null;  // Return null if the URL doesn't match the pattern
    }
}

function SubmitGithubLink({ hash, code, setReloadCount }) {
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');

  function toggleForm(event) {
    event.preventDefault();
    setShowForm(cur => !cur);
  }

  async function submitForm(event) {
    event.preventDefault();
    if(!getGithubUrlDetails(url)) {
      toast.error('Invalid Github blob URL!');
      return;
    }
    setShowForm(false);
    toast.loading('Submitting Github URL...');
    try {
      const result = await fetch(import.meta.env.VITE_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: {
            action: 'storeGithubHash',
            url,
            code,
            hash,
          },
        }),
      });
      const data = await result.json();
      if(data.hash !== hash) {
        toast.dismiss();
        toast.error(data.errorMessage || 'Not a match!');
        return;
      } else {
        setReloadCount(n => n + 1);
      }
      toast.dismiss();
      toast.success('Successful Github source match!');
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error(err.message);
    }
  }

  return (<>
    <button
      className={`${clsIconA} text-sm text-nowrap inline-block px-2`}
      onClick={toggleForm}
    >Submit link...</button>
    <dialog open={showForm} className={`
      z-50 left-5
      mx-3 -mt-5 px-6 pt-6 pb-2 border rounded-md
      bg-neutral-100 border-neutral-300
      dark:bg-neutral-900 dark:border-neutral-600
      shadow-xl shadow-neutral-200 dark:shadow-neutral-700
    `}>
      <form onSubmit={submitForm} className="inline">
        <p className="dark:text-slate-200">Github source blob URL at a specific commit hash:</p>
        <input
          placeholder="https://github.com/username/repository/blob/abcdefabcdefabcdefabcdefabcdefabcdefabcd/src/circuit.circom"
          className={`${clsInput} mt-1 mb-4`}
          onChange={(e) => setUrl(e.target.value)}
          value={url}
        />
        <button
          type="submit"
          className={`${clsButton}`}
        >Submit</button>
        <button
          type="button"
          className={`${clsButton}`}
          onClick={toggleForm}
        >Cancel</button>
      </form>
    </dialog>
  </>);
}

import React, { useState, useEffect, useRef } from 'react';
import Prism from 'prismjs';
import { toast } from 'react-hot-toast';

import prismLineNumbers from '../utils/prism-line-numbers.js';
import {generateSHA256Hash} from '../utils.js';
import {clsInput, clsIconA} from './Layout.js';
import {AnnotatedText} from './AnnotatedText.js';
import {PopupDialog} from './PopupDialog.js';
import CopyLink from './CopyLink.js';

const CodeBlock = ({ code, language, annotated }) => {
  useEffect(() => {
    if(!annotated) {
      prismLineNumbers(Prism);
      Prism.highlightAll();
    }
  }, [code, language, annotated]);

  return (<>
    <GithubLink {...{code}} />
    <CopyLink className="float-right mb-2" text={code} hideText={true} />
    <pre
      className="line-numbers w-full bg-slate-100 dark:bg-slate-900 dark:text-white"
    >
      <code className={`language-${language}`}>
        {annotated ?
          <AnnotatedText text={annotated.content} sections={annotated.templates} />
          : typeof code === 'string' ? code : null}
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

  async function reload(cache) {
    setLoading(true);
    if(!code || code === 'Loading...') return;
    setData(null);
    setHash(null);
    setError(null);
    try {
      const hash = await generateSHA256Hash(code);
      setHash(hash);
      const result = await fetch(`${import.meta.env.VITE_BLOB_URL}github-hash/${hash}.json`, {cache});
      const data = await result.json();
      setData(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload() }, [code]);
  // Reloads after updates should break the cache
  useEffect(() => { reload('reload') }, [reloadCount]);

  if(loading) return(<>
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
          className={`${clsIconA} truncate text-nowrap block px-2`}
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
  const [url, setUrl] = useState('');
  const inputRef = useRef(null);

  async function submitForm(event, hideForm) {
    if(!getGithubUrlDetails(url)) {
      toast.error('Invalid Github blob URL!');
      return;
    }
    hideForm();
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
      }
      setReloadCount(n => n + 1);
      toast.dismiss();
      toast.success('Successful Github source match!');
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error(err.message);
    }
  }

  return (
    <PopupDialog
      linkText="Submit link..."
      onSubmit={submitForm}
      {...{inputRef}}
    >
      <p className="dark:text-slate-200">Github source blob URL at a specific commit hash:</p>
      <input
        placeholder="https://github.com/username/repository/blob/abcdefabcdefabcdefabcdefabcdefabcdefabcd/src/circuit.circom"
        className={`${clsInput} mt-1 mb-4`}
        onChange={(e) => setUrl(e.target.value)}
        value={url}
        ref={inputRef}
      />
    </PopupDialog>
  );
}

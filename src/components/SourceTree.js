import {useState, useEffect} from 'react';
import {
  ArrowDownOnSquareStackIcon,
} from '@heroicons/react/24/outline';

import CodeBlock from './CodeBlock.js';
import Card from './Card.js';
import {clsButton, clsIconA} from './Layout.js';
import {
  loadListOrFile,
  formatBytes,
} from '../utils.js';

export function SourceTree({ pkgName, rootFile, sourceSize }) {
  const [list, setList] = useState(null);
  const [source, setSource] = useState(null);
  const [curFile, setCurFile] = useState(rootFile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingFile, setLoadingFile] = useState(true);
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const result = await loadListOrFile(`${pkgName}/source.zip`);
        setList(result.filter(x => x.compressedSize > 0));
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, []);

  useEffect(() => {
    const loadAsyncData = async () => {
      setLoadingFile(true);
      try {
        const result = await loadListOrFile(`${pkgName}/source.zip`, curFile);
        setSource(result);
      } catch (err) {
        setFileError(err);
      } finally {
        setLoadingFile(false);
      }
    };

    loadAsyncData();
  }, [curFile]);

  if (loading) return <Card>Loading source file list...</Card>;
  if (error) return <Card>Error loading source file list: {error.message}</Card>;

  return <Card>
    <select
      className={clsButton}
      onChange={e => setCurFile(e.target.value)}
      value={curFile}
    >
      {list.map(file => <option key={file.fileName}>{file.fileName}</option>)}
    </select>
    <a
      href={`${import.meta.env.VITE_BLOB_URL}${pkgName}/source.zip`}
      target="_blank"
      rel="noopener"
      title={`Download Sources (${formatBytes(sourceSize)})`}
      className={`${clsIconA} print:hidden`}
    >
      <ArrowDownOnSquareStackIcon className="inline h-5 w-5" />
    </a>
    {loadingFile ? <CodeBlock code="Loading..." />
      : fileError ? <CodeBlock code="Error loading source!" />
      : <CodeBlock code={source} language="circom" />}
  </Card>;
}

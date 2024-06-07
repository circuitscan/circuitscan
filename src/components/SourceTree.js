import {useState, useEffect} from 'react';
import { S3Client } from '@aws-sdk/client-s3';
import S3RangeZip from 's3-range-zip';

import CodeBlock from './CodeBlock.js';
import Card from './Card.js';
import {clsButton} from './Layout.js';

async function loadFileList(pkgName, filename) {
  const zipUrl = `${pkgName}/source.zip`;
  const s3 = new S3Client({
    region: import.meta.env.VITE_BB_REGION,
    credentials: {
      accessKeyId: import.meta.env.VITE_READ_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_READ_SECRET_ACCESS_KEY,
    },
    endpoint: import.meta.env.VITE_BB_ENDPOINT,
  });
  const zipReader = new S3RangeZip(s3);
  const fileList = await zipReader.fetchFileList(
    import.meta.env.VITE_BB_BUCKET,
    zipUrl
  );

  if(filename) {
    const file = await zipReader.downloadFile(
      import.meta.env.VITE_BB_BUCKET,
      zipUrl,
      filename,
      {encoding: 'utf8'}
    );
    return file;
  }

  return fileList;
}

export function SourceTree({ pkgName, rootFile }) {
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
        const result = await loadFileList(pkgName);
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
        const result = await loadFileList(pkgName, curFile);
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
    {loadingFile ? <CodeBlock code="Loading..." />
      : fileError ? <CodeBlock code="Error loading source!" />
      : <CodeBlock code={source} language="circom" />}
  </Card>;
}

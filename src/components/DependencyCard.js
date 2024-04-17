import {useState} from 'react';

import Card from './Card.js';
import CodeBlock from './CodeBlock.js';
import {fetchBlob} from '../utils.js';

export default function DependencyCard({
  file, hash
}) {
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('Loading...');

  async function toggle() {
    setShow(old => !old);
    setCode(await fetchBlob(hash));
  }

  return (
    <Card>
      <button
        className="text-l font-bold"
        onClick={toggle}
      >Dependency: {file}</button>
      {show && <CodeBlock
        {...{code}}
        language="circom"
      />}
    </Card>
  );
}

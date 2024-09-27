import {useState, useEffect} from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
} from '@heroicons/react/24/solid';

import Card from './Card.js';
import {clsIconA, clsButton} from './Layout.js';
import {findChain, fetchInfo} from '../utils.js';

const PERPAGE = 5;

export default function Newest() {
  const [page, setPage] = useState(0);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  const reload = async (cache) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetch(import.meta.env.VITE_BLOB_URL + 'latest.json', {cache});
      const data = await result.json();
      setList(data.list.reverse());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload() }, []);
  // Reloads after updates should break the cache
  useEffect(() => { reload('reload') }, [reloadCount]);

  return (<>
    {loading ? <>
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p className="p-6">Loading newest submissions...</p>
        </div>
      </Card>
    </> : error ? <>
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p className="p-6">Error loading newest submissions!</p>
        </div>
      </Card>
    </> : list && list.length === 0 ? <>
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p className="p-6">No verifiers verified yet!</p>
        </div>
      </Card>
    </> : list ? <>
      <Card>
          <button
            onClick={() => setReloadCount(reloadCount + 1)}
            className={`${clsIconA} flex float-right mt-8 leading-4`}
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Refresh
          </button>
          <h3 className={`
            text-xl pt-6 pb-3
            border-b border-neutral-300 dark:border-neutral-600
          `}>Latest Verified Circuit Verifiers</h3>
          <ul className="mb-6">
            {list.slice(0, PERPAGE * (page + 1)).map((row, index) => (
              <li key={index} className={`
              `}>
                <Link
                  className={`
                    py-3 flex items-center justify-between
                    border-b border-neutral-300 dark:border-neutral-600
                    ${clsIconA}
                  `}
                  to={`/chain/${row.chain}/address/${row.address}#source-code`}
                >
                  <span className={`
                    inline-block pl-3 pr-2 py-1 mr-3
                    border rounded-full bg-neutral-200 dark:bg-neutral-900
                    border-neutral-400 dark:border-neutral-600
                    text-sm
                  `}>{findChain(row.chain).name}</span>
                  <span className={`
                    text-ellipsis inline-block overflow-hidden
                    mr-1 grow
                  `}>
                    <span className="font-bold">
                      <VerifierDisplay pkgName={row.pkgName} />
                    </span>
                    <span className="text-sm block">{row.address}</span>
                  </span>
                  <span className={`
                  `}>{(new Date(row.createdAt * 1000)).toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
          {PERPAGE * page < list.length &&
            <button onClick={() => setPage(page + 1)} className={clsButton}>
              Load More...
            </button>}
      </Card>
    </> : null}
  </>);
}

function VerifierDisplay({ pkgName }) {
  const [info, setInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const result = await fetchInfo(pkgName);
        setInfo(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, []);

  return (<>
    {loading ? <>
      Loading...
    </> : info && info.circuit ? <>
      {info.circuit.template}({info.circuit.params && info.circuit.params.join(', ')}) - {info.protocol}
    </> : info && info.type === 'groth16multi' ? <>
      Groth16 Multi Verifier{info.payload.modifier && <>&nbsp;({info.payload.modifier})</>}
    </> : info && info.type === 'noir' ? <>
      {info.nargoToml.package.name} - noir (barretenberg)
    </> : <>
      Error loading!
    </>}
  </>);
}

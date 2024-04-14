import {useState} from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import useFetchJson from './useFetchJson.js';
import Card from './Card.js';
import {clsIconA, clsButton} from './Layout.js';
import {findChain} from '../utils.js';

const PERPAGE = 5;

export default function Newest() {
  const [page, setPage] = useState(0);
  const [showLoadMore, setShowLoadMore] = useState(true);
  const {data, loading, error, setData} = useFetchJson(
    import.meta.env.VITE_API_URL,
    {
      payload: {
        action: 'newest',
        offset: 0,
        limit: PERPAGE,
      },
    },
  );

  async function loadNextPage() {
    toast.dismiss();
    toast.loading('Loading more...');
    setPage(page + 1);
    const response = await fetch(import.meta.env.VITE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payload: {
          action: 'newest',
          offset: (page + 1) * PERPAGE,
          limit: PERPAGE,
        },
      }),
    });
    const newPage = await response.json();
    if(newPage.length < PERPAGE) setShowLoadMore(false);
    setData(data => [...data, ...newPage]);
    toast.dismiss();
  }

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
    </> : data && data.length === 0 ? <>
      <Card>
        <div className="flex flex-col w-full content-center items-center">
          <p className="p-6">No verifiers verified yet!</p>
        </div>
      </Card>
    </> : data ? <>
      <Card>
          <h3 className={`
            text-xl pt-6 pb-3
            border-b border-neutral-300 dark:border-neutral-600
          `}>Latest Verified Circuit Verifiers</h3>
          <ul className="mb-6">
            {data.map((row, index) => (
              <li key={index} className={`
              `}>
                <Link
                  className={`
                    py-3 flex items-center justify-between
                    border-b border-neutral-300 dark:border-neutral-600
                    ${clsIconA}
                  `}
                  to={`/chain/${row.chainid}/address/${row.address}`}
                >
                  <span className={`
                    inline-block pl-3 pr-2 py-1 mr-1
                    border rounded-full bg-neutral-200 dark:bg-neutral-900
                    border-neutral-400 dark:border-neutral-600
                    text-sm
                  `}>{findChain(row.chainid).name}</span>
                  <span className={`
                    text-ellipsis inline-block overflow-hidden
                    mr-1
                  `}>{row.address}</span>
                  <span className={`
                  `}>{(new Date(row.created_at)).toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
          {data.length % PERPAGE === 0 && showLoadMore &&
            <button onClick={loadNextPage} className={clsButton}>
              Load More...
            </button>}
      </Card>
    </> : null}
  </>);
}

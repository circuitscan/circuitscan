import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { isAddress } from 'viem';

export const clsButton = `
  px-4 py-2 mr-4 bg-slate-100 dark:bg-slate-900 dark:text-white rounded-md
  hover:bg-slate-300 active:bg-slate-400
  dark:hover:bg-slate-800 dark:active:bg-slate-700
  disabled:bg-slate-400 disabled:dark:bg-slate-600
  border border-zinc-300 dark:border-zinc-600
`;

export const clsInput = `
  p-3
  bg-slate-100 dark:bg-slate-900
  dark:text-white
  border border-zinc-300 dark:border-zinc-600
  rounded-md
`;

export const clsIconA = `
  hover:text-fuchsia-700 active:text-fuchsia-500
`;


export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.toLowerCase();
  const [searchAddress, setSearchAddress] = useState('');

  async function handleSearch(event) {
    event.preventDefault();
    if(!isAddress(searchAddress)) return;
    navigate(`/address/${searchAddress}`);
    setSearchAddress('');
    document.activeElement.blur();
  }

  return (<>
      <Toaster />
      <header className={`
        flex-col
        sm:flex-row
        flex justify-between p-3
        bg-zinc-100 dark:bg-zinc-900
        border-b border-zinc-300 dark:border-zinc-600
      `}>
        <div className="p-4">
          <Link to="/"><h1 className="text-3xl font-bold">Circuitscan</h1></Link>
        </div>
        <div className="flex space-x-4 place-items-center">
          <form onSubmit={handleSearch}>
            <input
              className={clsInput}
              type="search"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Search Contract Address..."
            />
          </form>
        </div>
      </header>
      <Outlet />
  </>);
}

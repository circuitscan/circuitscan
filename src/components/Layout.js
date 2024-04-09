import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { isAddress } from 'viem';

export const clsButton = `
  px-4 py-2 mr-4 mb-4 bg-slate-100 dark:bg-slate-900 dark:text-white rounded-md
  hover:bg-slate-300 active:bg-slate-400
  dark:hover:bg-slate-800 dark:active:bg-slate-700
  border border-zinc-300 dark:border-zinc-600
`;

export const clsInput = `
  px-3 py-2 w-full
  bg-slate-100 dark:bg-slate-900
  dark:text-white
  border border-zinc-300 dark:border-zinc-600
  rounded-md
`;

export const clsIconA = `
  hover:text-lightaccent active:text-lightaccent
  dark:hover:text-darkaccent dar:active:text-darkaccent
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
      <header id="logo" className={`
        flex-col
        sm:flex-row items-end sm:items-center
        flex justify-between px-3 py-2 sm:py-1
        border-b border-zinc-300 dark:border-zinc-600
      `}>
        <div className="w-full">
          <Link to="/">
            <h1 className={`
              sm:pl-14 sm:w-auto
              w-full text-3xl text-right sm:text-left
              text-slate-900 dark:text-slate-200
            `}>Circuitscan</h1>
          </Link>
        </div>
        <div className="flex space-x-4 place-items-center">
          <form onSubmit={handleSearch}>
            <input
              className={`${clsInput} min-w-72 focus:min-w-80 transition-all`}
              type="search"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Go to Contract Address..."
            />
          </form>
        </div>
      </header>
      <Outlet />
  </>);
}

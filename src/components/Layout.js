import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { isAddress } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook } from '@fortawesome/free-solid-svg-icons';
import { faGithub, faTelegram, faMedium } from '@fortawesome/free-brands-svg-icons';

export const clsButton = `
  px-4 py-2 mx-2 mb-4 bg-neutral-100 dark:bg-neutral-900 dark:text-white rounded-md
  hover:bg-neutral-200 active:bg-neutral-300
  dark:hover:bg-neutral-800 dark:active:bg-neutral-700
  border border-neutral-300 dark:border-neutral-600
  disabled:dark:bg-neutral-800 disabled:text-gray-400 disabled:dark:text-gray-600
`;

export const clsInput = `
  px-3 py-1 w-full
  bg-neutral-100 dark:bg-neutral-900
  dark:text-white
  border border-neutral-300 dark:border-neutral-600
  rounded-md
`;

export const clsIconA = `
  hover:text-lightaccent active:text-lightaccent
  dark:hover:text-darkaccent dark:active:text-darkaccent
  disabled:dark:text-neutral-600 disabled:text-neutral-300
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
      <a
        href="https://octant.app/project/8/0xa48c718AE6dE6599c5A46Fd6caBff54Def39473a"
        target="_blank"
        rel="noopener"
        className={`
          bg-lightaccent dark:bg-darkaccent
          text-lightbg dark:text-darkbg
          text-center font-bold
          block p-2
        `}>
        Circuitscan is participating in Octant Epoch 8 from July 11-25! 🎉
      </a>
      <header className={`
        bg-neutral-50 dark:bg-neutral-900
        border-b border-neutral-300 dark:border-neutral-600
        shadow-xl shadow-neutral-200 dark:shadow-neutral-700
        print:shadow-none
      `}>
        <div id="logo" className={`
          px-3 py-2 sm:py-3
          mx-auto
          flex-col sm:flex-row items-end sm:items-center
          flex justify-between
        `}>
          <div className="w-full">
            <Link to="/">
              <h1 className={`
                sm:pl-12 sm:w-auto py-2 sm:py-0 print:pl-0
                w-full text-2xl text-right sm:text-left
                text-slate-900 dark:text-slate-200
                tracking-tight
              `}>Circuitscan</h1>
            </Link>
          </div>
          <div className="flex space-x-4 place-items-center print:hidden">
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
        </div>
      </header>
      <Outlet />
      <footer className="flex space-x-3 justify-center print:hidden">
        <a href="https://github.com/circuitscan" rel="noopener" target="_blank" title="Circuitscan on Github">
          <FontAwesomeIcon icon={faGithub} size="xl" />
        </a>&nbsp;
        <a href="https://circuitscan.readthedocs.io" rel="noopener" target="_blank" title="Circuitscan documentation">
          <FontAwesomeIcon icon={faBook} size="xl" />
        </a>&nbsp;
        <a href="https://medium.com/@circuitscan" rel="noopener" target="_blank" title="Circuitscan development blog">
          <FontAwesomeIcon icon={faMedium} size="xl" />
        </a>&nbsp;
        <a href="https://t.me/circuitscan" rel="noopener" target="_blank" title="Circuitscan Telegram group">
          <FontAwesomeIcon icon={faTelegram} size="xl" />
        </a>
      </footer>
  </>);
}

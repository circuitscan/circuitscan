import {
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
  FolderArrowDownIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import bsUrls from 'blockscout-urls';

import {clsIconA} from './Layout.js';
import {
  setClipboard,
  formatBytes,
} from '../utils.js';

export default function AddressHeader({
  className,
  address,
  data,
  deployedChain,
  isAddressOnThisChain,
}) {
  return (
    <h2 className={`${className || ''} text-l mb-3`}>
      {data && isAddressOnThisChain !== null && <div className="inline-block mr-1 align-middle">
        <div className={`
          flex pl-2 pr-3 py-1
          border rounded-full bg-neutral-200 dark:bg-neutral-900
          border-neutral-400 dark:border-neutral-600
          text-sm
        `}>
          {isAddressOnThisChain ? <>
            <CheckIcon className="h-5 w-5 text-blue-500" />
            <p>Circuit Verified</p>
          </> : <>
            <XMarkIcon className="h-5 w-5 text-red-500" />
            <p>Circuit not verified</p>
          </>}
        </div>
      </div>}

      <span className="mr-1 align-middle text-ellipsis overflow-hidden max-w-full inline-block">{address}</span>

      <span className="whitespace-nowrap inline-block">
        <a
          href={`web3://${address}`}
          onClick={() => setClipboard(address)}
          title="Copy Address to Clipboard"
          className={`${clsIconA} print:hidden`}
        >
          <DocumentDuplicateIcon className="inline h-5 w-5" />
        </a>&nbsp;

        {deployedChain && <a
          href={`${deployedChain.id in bsUrls ? 'https://' + bsUrls[deployedChain.id] : deployedChain.blockExplorers ? deployedChain.blockExplorers.default.url : 'circuitscan.org'}/address/${address}`}
          target="_blank"
          rel="noopener"
          title="View on Block Explorer"
          className={`${clsIconA} print:hidden`}
        >
          <ArrowTopRightOnSquareIcon className="inline h-5 w-5" />
        </a>}&nbsp;

        {data && data[deployedChain.id].info.pkgSize && <><a
          href={`${import.meta.env.VITE_BLOB_URL}build/${data[deployedChain.id].pkg_name}/pkg.zip`}
          target="_blank"
          rel="noopener"
          title={`Download Entire Build (${formatBytes(data[deployedChain.id].info.pkgSize)})`}
          className={`${clsIconA} print:hidden`}
        >
          <FolderArrowDownIcon className="inline h-5 w-5" />
        </a>&nbsp;</>}

        {isAddressOnThisChain && <a
          href={`https://remix.ethereum.org/address/${address}`}
          target="_blank"
          rel="noopener"
          title="View on Remix IDE"
          className={`${clsIconA} print:hidden`}
        >
          <PencilSquareIcon className="inline h-5 w-5" />
        </a>}
      </span>

    </h2>
  );
}

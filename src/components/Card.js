
export default function Card({ children, fullWidth }) {
  return (<div className={`
    grow
    ${fullWidth ? '' : 'max-w-7xl xl:mx-auto'}
    mx-3 my-6 p-6 border rounded-md
    bg-neutral-100 border-neutral-300
    dark:bg-neutral-900 dark:border-neutral-600
    shadow-xl shadow-neutral-200 dark:shadow-neutral-700
    print:shadow-none
  `}>{children}</div>);
}

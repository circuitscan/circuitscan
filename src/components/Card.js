
export default function Card({ children, fullWidth, className }) {
  return (<div className={`
    grow
    ${fullWidth ? '' : 'max-w-7xl xl:mx-auto'}
    mx-3 my-6 p-6 border rounded-md
    bg-neutral-100 border-neutral-200
    dark:bg-neutral-900 dark:border-neutral-800
    ${className}
  `}>{children}</div>);
}

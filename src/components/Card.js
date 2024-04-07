
export default function Card({ children }) {
  return (<div className={`
    mx-3 my-6 p-6 border rounded-md
    bg-zinc-100 border-zinc-300
    dark:bg-zinc-900 dark:border-zinc-600
  `}>{children}</div>);
}

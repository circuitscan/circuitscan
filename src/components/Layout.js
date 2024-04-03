import { Outlet, Link, useLocation } from "react-router-dom";

export function Layout() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  return (<>
      <header className={`
        flex justify-between p-3
        bg-zinc-100 dark:bg-zinc-900
        border-b border-zinc-300 dark:border-zinc-600
      `}>
        <div className="">
          <Link to="/"><h1 className="text-3xl font-bold">Circuitscan</h1></Link>
        </div>
        <div className="">
        </div>
      </header>
      <Outlet />
  </>);
}

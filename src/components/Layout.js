import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Outlet, Link, useLocation } from "react-router-dom";

export function Layout() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  return (<>
      <header className="flex justify-between p-6">
        <div className="">
          <Link to="/"><h1 className="text-3xl font-bold">Circuitscan</h1></Link>
        </div>
        <div className="">
          <ConnectButton />
        </div>
      </header>
      <Outlet />
  </>);
}

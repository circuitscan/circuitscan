import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Outlet, Link, useLocation } from "react-router-dom";

export function Layout() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  return (<>
      <header>
        <div className="">
          <Link to="/"><h1>Circuitscan</h1></Link>
        </div>
        <div className="account">
          <ConnectButton />
        </div>
      </header>
      <Outlet />
  </>);
}

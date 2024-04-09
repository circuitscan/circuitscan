import { createBrowserRouter, RouterProvider, Navigate, useParams } from "react-router-dom";
import { Layout } from './components/Layout.js';
import { Home } from './pages/Home.js';
import { Address } from './pages/Address.js';
import { Deploy } from './pages/Deploy.js';

export function Router() {
  const router = createBrowserRouter([
    {
      element: <Layout />,
      children: [
        {
          errorElement: <ErrorPage />,
          children: [
            {
              path: "/",
              element: <Home />,
            },
            {
              path: "address/:address",
              element: <Address />,
            },
            {
              path: "chain/:chain/address/:address",
              element: <Address />,
            },
            {
              path: "deploy",
              element: <Deploy />,
            },
            {
              path: "*",
              element: <ErrorPage />,
            },
          ],
        },
      ],
    },
  ]);
  return (
    <RouterProvider {...{router}} />
  );
}

function ErrorPage() {
  return (<p className="p-6">An error has occurred!</p>);
}

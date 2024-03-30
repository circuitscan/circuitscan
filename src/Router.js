import { createBrowserRouter, RouterProvider, Navigate, useParams } from "react-router-dom";
import { Layout } from './components/Layout.js';
import { Home } from './pages/Home.js';
import { Address } from './pages/Address.js';

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
  return (<p>An error has occurred!</p>);
}

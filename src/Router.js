import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useParams } from "react-router-dom";
import { Layout } from './components/Layout.js';
import Card from './components/Card.js';
import { Home } from './pages/Home.js';

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
              element: <DynamicPageLoader pageName="Address" />,
            },
            {
              path: "chain/:chain/address/:address",
              element: <DynamicPageLoader pageName="Address" />,
            },
            {
              path: "deploy-verifier/:reference",
              element: <DynamicPageLoader pageName="DeployVerifier" />,
            },
            {
              path: "manage-api-key",
              element: <DynamicPageLoader pageName="ApiKey" />,
            },
            {
              path: "verify",
              element: <DynamicPageLoader pageName="Verify" />,
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

function DynamicPageLoader({ pageName }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAsyncData = async () => {
      try {
        const loaded = await import(`./pages/${pageName}.js`);
        setPage(loaded);
      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAsyncData();
  }, []);

  if(loading) return <Card><p className="text-center my-8">Loading...</p></Card>;
  if(error) return <Card>Error loading page!</Card>;
  return <page.default />;
};

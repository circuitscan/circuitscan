import { useState, useEffect, useRef } from 'react';

export default function useFetchJson(url, body) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Development docker server can only handle one request at a time
  // Also, it's good practice for prod too
  const requestSent = useRef(false);

  useEffect(() => {
    if (requestSent.current) {
      return;
    }

    const fetchData = async () => {
      if(!url) {
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(url, body ? {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        } : undefined);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    requestSent.current = true;
    fetchData();
  }, []);

  return { data, loading, error, setData };
};


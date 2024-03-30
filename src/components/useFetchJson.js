import { useState, useEffect } from 'react';
// From ChatGPT

const useFetchJson = (url) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if(!url) {
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(url);
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

    fetchData();
  }, [url]); // Dependencies array with the URL, so it refetches when the URL changes

  return { data, loading, error };
};

export default useFetchJson;


import { useState, useCallback } from 'react';

// Custom hook definition
const useFetchPost = () => {
    // State for storing the data returned from the POST request
    const [data, setData] = useState(null);
    // State to indicate whether the request is loading
    const [loading, setLoading] = useState(false);
    // State for storing any error that occurs during the fetch process
    const [error, setError] = useState(null);

    // useCallback ensures that the function isn't recreated on every render
    const post = useCallback(async (url, body) => {
        setLoading(true); // Begin loading state
        setError(null); // Reset error state
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json(); // Parse JSON response
            setData(data); // Update state with the fetched data
        } catch (error) {
            setError(error.message); // If an error occurs, set the error state
        } finally {
            setLoading(false); // End loading state
        }
    }, []); // Empty dependency array means this callback never changes

    // Return the post function and state
    return { post, data, loading, error };
};

export default useFetchPost;


import { useState, useEffect } from 'react';

function useLocalStorageState(key, initialValue) {
  // Get the initial state from localStorage or use the provided initial value
  const [state, setState] = useState(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue !== null ? JSON.parse(storedValue) : initialValue;
    } catch (error) {
      console.error("Error accessing localStorage", error);
      return initialValue;
    }
  });

  // Update localStorage and sync across tabs/windows
  const setAndSyncState = (newValue) => {
    try {
      // Update state in React
      setState(newValue);

      // Update localStorage
      localStorage.setItem(key, JSON.stringify(newValue));

      // Manually dispatch a "storage" event to force sync within the same page
      const event = new StorageEvent('storage', {
        key,
        newValue: JSON.stringify(newValue),
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error saving to localStorage", error);
    }
  };

  // Sync with changes to localStorage from other tabs/windows or other components
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === key) {
        try {
          const newValue = event.newValue !== null ? JSON.parse(event.newValue) : initialValue;
          setState(newValue);
        } catch (error) {
          console.error("Error syncing with localStorage", error);
        }
      }
    };

    // Listen to both window's "storage" event and manually dispatched events
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [state, setAndSyncState];
}

export default useLocalStorageState;


import { useEffect, useState } from 'react';

// Custom hook to detect dark mode preference
const useDarkMode = () => {
  // State to store the preference
  const [prefersDarkMode, setPrefersDarkMode] = useState(false);

  useEffect(() => {
    // Function to update state based on the media query
    const updateDarkModePreference = (e) => {
      setPrefersDarkMode(e.matches);
    };

    // Create MediaQueryList object
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Initially check the preference
    setPrefersDarkMode(mediaQuery.matches);

    // Listen for changes in the preference
    mediaQuery.addEventListener('change', updateDarkModePreference);

    // Cleanup function to remove event listener
    return () => mediaQuery.removeEventListener('change', updateDarkModePreference);
  }, []);

  return prefersDarkMode;
};

export default useDarkMode;


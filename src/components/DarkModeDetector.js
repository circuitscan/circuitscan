import React, { useState, useEffect } from 'react';

// From ChatGPT4
const DarkModeDetector = ({ children, dark, light }) => {
  const [theme, setTheme] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? dark : light
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setTheme(e.matches ? dark : light);
    };

    mediaQuery.addListener(handleChange); // Add the event listener
    return () => mediaQuery.removeListener(handleChange); // Clean up
  }, []);

  return React.Children.map(children, child =>
    React.isValidElement(child) ? React.cloneElement(child, theme) : child
  );
};

export default DarkModeDetector;


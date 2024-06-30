import React, { useState, useEffect } from 'react';

const TabComponent = ({ tabs }) => {
  // Function to convert tab label to lowercase dashed version
  const toHash = (label) => label.toLowerCase().replace(/\s+/g, '-');

  // Get initial tab from the URL hash or default to the first tab
  const initialTab = () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const tab = Object.keys(tabs).find((tabLabel) => toHash(tabLabel) === hash);
      if (tab) {
        return tab;
      }
    }
    return Object.keys(tabs)[0];
  };

  const [activeTab, setActiveTab] = useState(initialTab);

  // Update the URL hash when the active tab changes
  useEffect(() => {
    window.location.hash = toHash(activeTab);
  }, [activeTab]);

  // Listen for hash changes and update the active tab
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      const tab = Object.keys(tabs).find((tabLabel) => toHash(tabLabel) === hash);
      if (tab) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [tabs]);

  return (
    <div>
      <div className="mx-3 flex border-b border-neutral-300 dark:border-neutral-600">
        {Object.keys(tabs).map((tabLabel) => (
          <button
            key={tabLabel}
            onClick={() => setActiveTab(tabLabel)}
            className={`py-2 px-4 cursor-pointer ${
              activeTab === tabLabel ? 'border-b-2 border-lightaccent dark:border-darkaccent font-bold' : ''
            }`}
          >
            {tabLabel}
          </button>
        ))}
      </div>
      <div className="">
        {tabs[activeTab]()}
      </div>
    </div>
  );
};

export default TabComponent;


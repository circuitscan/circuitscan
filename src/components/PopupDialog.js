import React, { useState, useEffect } from 'react';
import {clsButton, clsIconA} from './Layout.js';

export function PopupDialog({ linkText, onSubmit, inputRef, children }) {
  const [showForm, setShowForm] = useState(false);

  function toggleForm(event) {
    event.preventDefault();
    setShowForm(cur => !cur);
  }

  useEffect(() => {
    if (showForm && inputRef && inputRef.current) {
      inputRef.current.focus(); // Focus the input field when the form is shown
    }
    // Add an event listener for the Escape key to close the dialog
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowForm(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Cleanup event listener when the dialog is closed
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showForm]); // Trigger the focus whenever showForm changes to true

  function submitForm(event) {
    event.preventDefault();
    onSubmit(event, () => setShowForm(false));
  }

  return (<>
    <button
      className={`${clsIconA} text-sm text-nowrap inline-block px-2`}
      onClick={toggleForm}
    >{linkText}</button>
    <dialog open={showForm} className={`
      z-50 left-5
      mx-3 -mt-5 px-6 pt-6 pb-2 border rounded-md
      bg-neutral-100 border-neutral-300
      dark:bg-neutral-900 dark:border-neutral-600
      shadow-xl shadow-neutral-200 dark:shadow-neutral-700
    `}>
      <form onSubmit={submitForm} className="inline">
        {children}
        <button
          type="submit"
          className={`${clsButton}`}
        >Submit</button>
        <button
          type="button"
          className={`${clsButton}`}
          onClick={toggleForm}
        >Cancel</button>
      </form>
    </dialog>
  </>);
}

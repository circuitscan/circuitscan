import { useEffect } from 'react';

/**
 * Custom hook to show a confirmation dialog when the user tries to close the tab or leave the page.
 * 
 * @param {boolean} confirmClose - If true, enables the confirmation dialog on page close or reload.
 * @param {string} message - The message to display in the confirmation dialog.
 */
const useConfirmClose = (confirmClose, message = "Are you sure you want to leave this page?") => {
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (confirmClose) {
        event.preventDefault(); // Necessary for most browsers
        event.returnValue = message; // For older browsers
        return message; // For newer browsers
      }
    };

    if (confirmClose) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      // Cleanup the event listener on unmount or when confirmClose becomes false
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [confirmClose, message]);
};

export default useConfirmClose;


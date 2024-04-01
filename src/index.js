import React from 'react';
import ReactDOM from 'react-dom/client';

import { Router } from './Router.js';
import DarkModeDetector from './components/DarkModeDetector.js';

import './App.css';
import 'prismjs/themes/prism.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
);


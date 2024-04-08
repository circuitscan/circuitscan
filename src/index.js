import React from 'react';
import ReactDOM from 'react-dom/client';

import { Router } from './Router.js';
import DarkModeDetector from './components/DarkModeDetector.js';

import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  sepolia,
  holesky,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

import '@rainbow-me/rainbowkit/styles.css';
import 'prismjs/themes/prism.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';
import './App.css';

const config = getDefaultConfig({
  appName: 'Circuitscan',
  projectId: '3ab784972e6540d0095810e72372cfd1',
  chains: [sepolia, holesky],
});
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DarkModeDetector
          dark={{ theme: darkTheme({ accentColor: '#cc2ab9'}) }}
          light={{ theme: lightTheme({ accentColor: '#06a01c'}) }}
        >
          <RainbowKitProvider modalSize="compact">
            <Router />
          </RainbowKitProvider>
        </DarkModeDetector>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);


import React from 'react';
import ReactDOM from 'react-dom/client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import { holesky } from 'wagmi/chains';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from '@rainbow-me/rainbowkit';

import { Router } from './Router.js';
import DarkModeDetector from './components/DarkModeDetector.js';

import './App.css';
import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: 'Circuitscan',
  projectId: '3ab784972e6540d0095810e72372cfd1',
  chains: [holesky],
  ssr: false, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();
const themeConfig = {
  accentColor: '#c22b66',
  fontStack: 'sans-serif',
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DarkModeDetector
          dark={{ theme: darkTheme(themeConfig) }}
          light={{ theme: lightTheme(themeConfig) }}
        >
          <RainbowKitProvider modalSize="compact">
            <Router />
          </RainbowKitProvider>
        </DarkModeDetector>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);


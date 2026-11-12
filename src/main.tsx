import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom'; // Import Router
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import theme from './theme'; // Import the custom theme
import App from './App';
import './index.css';
import { initDevMode } from './utils/devMode';
import { initColorModePreference } from './store/themeStore';

initDevMode(); // Apply ?dev=1 / ?dev=0 before anything reads the flag
initColorModePreference(); // Follow the phone's light/dark setting on boot, unless one was picked

// The app lives at <base>app/; the site root is the marketing homepage (see vite.config.ts).
const base = `${import.meta.env.BASE_URL}app/`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={base}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <ChakraProvider theme={theme}>
          <App />
        </ChakraProvider>
      </BrowserRouter>
    </QueryClientProvider>
  // </React.StrictMode>
);

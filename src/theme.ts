import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system', // Use system preference
  useSystemColorMode: true,  // Automatically switch based on system settings
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        // bg: 'gray.100', // Light mode background
        // color: 'gray.800', // Light mode text
        // _dark: {
        //   bg: 'gray.900', // Dark mode background
        //   color: 'gray.100', // Dark mode text
        // },
      },
    },
  },
});

export default theme;

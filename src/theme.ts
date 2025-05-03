import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'light' ? 'gray.50' : 'gray.900',
        color: props.colorMode === 'light' ? 'gray.800' : 'gray.100',
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'lg',
        fontWeight: 'medium',
      },
      defaultProps: {
        colorScheme: 'cyan',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'xl',
          overflow: 'hidden',
        },
      },
      variants: {
        elevated: (props: any) => ({
          container: {
            boxShadow: 'lg',
            bg: props.colorMode === 'light' ? 'white' : 'gray.800',
            _hover: {
              transform: 'translateY(-2px)',
              boxShadow: 'xl',
            },
            transition: 'all 0.2s',
          },
        }),
        outline: (props: any) => ({
          container: {
            borderWidth: '1px',
            bg: props.colorMode === 'light' ? 'white' : 'gray.800',
            _hover: {
              transform: 'translateY(-2px)',
              boxShadow: 'md',
            },
            transition: 'all 0.2s',
          },
        }),
      },
    },
    Container: {
      baseStyle: {
        px: { base: 4, md: 6 },
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: 'bold',
      },
    },
    Alert: {
      baseStyle: {
        container: {
          borderRadius: 'xl',
        },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          borderRadius: 'xl',
          overflow: 'hidden',
          border: 'none',
          boxShadow: 'lg',
          p: 2,
        },
        item: {
          borderRadius: 'lg',
        },
      },
    },
  },
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
  },
  space: {
    '4.5': '1.125rem',
  },
  radii: {
    'xl': '1rem',
    '2xl': '1.5rem',
  },
  shadows: {
    outline: '0 0 0 3px rgba(0, 204, 255, 0.2)',
  },
  transition: {
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    duration: {
      default: '200ms',
    },
  },
});

export default theme;

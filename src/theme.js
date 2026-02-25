import { extendTheme } from "@chakra-ui/react";

// ✅ Change entire project color from .env
export const brand = {
  primary:      import.meta.env.VITE_PRIMARY_COLOR  || "#2563eb",
  primaryLight: import.meta.env.VITE_PRIMARY_LIGHT  || "#eff6ff",
  primaryHover: import.meta.env.VITE_PRIMARY_HOVER  || "#1d4ed8",
  sidebar:      import.meta.env.VITE_SIDEBAR_COLOR  || "#2563eb",
  accent:       import.meta.env.VITE_ACCENT_COLOR   || "#e53e3e",
};

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50:  brand.primaryLight,
      100: brand.primaryLight,
      200: brand.primary + "33",
      300: brand.primary + "66",
      400: brand.primary + "99",
      500: brand.primary,
      600: brand.primaryHover,
      700: brand.primaryHover,
      800: brand.primaryHover,
      900: brand.primaryHover,
    },
    accent: {
      500: brand.accent,
    },
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === "dark" ? "gray.900" : "gray.50",
        color: props.colorMode === "dark" ? "white" : "gray.800",
      },
      "table": {
        color: props.colorMode === "dark" ? "white" : "gray.800",
      },
      "th, td": {
        borderColor: props.colorMode === "dark" ? "#4a5568 !important" : "#e5e7eb !important",
        color: props.colorMode === "dark" ? "white !important" : "inherit",
      },
      "thead": {
        background: props.colorMode === "dark" ? "#2a4365 !important" : `${brand.primaryLight} !important`,
      },
      "input, textarea, select": {
        background: props.colorMode === "dark" ? "#2d3748 !important" : "white !important",
        color: props.colorMode === "dark" ? "white !important" : "#1a202c !important",
        borderColor: props.colorMode === "dark" ? "#4a5568 !important" : "#cccccc !important",
      },
      "input::placeholder, textarea::placeholder": {
        color: props.colorMode === "dark" ? "#718096 !important" : "#a0aec0 !important",
      },
      "option": {
        background: props.colorMode === "dark" ? "#2d3748" : "white",
        color: props.colorMode === "dark" ? "white" : "#1a202c",
      },
    }),
  },
  components: {
    Input: {
      variants: {
        outline: (props) => ({
          field: {
            bg: props.colorMode === "dark" ? "gray.700" : "white",
            color: props.colorMode === "dark" ? "white" : "gray.800",
            borderColor: props.colorMode === "dark" ? "gray.600" : "gray.200",
            _placeholder: { color: props.colorMode === "dark" ? "gray.400" : "gray.400" },
            _hover: { borderColor: props.colorMode === "dark" ? "gray.500" : "gray.300" },
            _focus: { borderColor: brand.primary, boxShadow: `0 0 0 1px ${brand.primary}` },
          },
        }),
      },
    },
    Select: {
      variants: {
        outline: (props) => ({
          field: {
            bg: props.colorMode === "dark" ? "gray.700" : "white",
            color: props.colorMode === "dark" ? "white" : "gray.800",
            borderColor: props.colorMode === "dark" ? "gray.600" : "gray.200",
            _hover: { borderColor: props.colorMode === "dark" ? "gray.500" : "gray.300" },
            _focus: { borderColor: brand.primary, boxShadow: `0 0 0 1px ${brand.primary}` },
          },
        }),
      },
    },
    Textarea: {
      variants: {
        outline: (props) => ({
          bg: props.colorMode === "dark" ? "gray.700" : "white",
          color: props.colorMode === "dark" ? "white" : "gray.800",
          borderColor: props.colorMode === "dark" ? "gray.600" : "gray.200",
          _placeholder: { color: props.colorMode === "dark" ? "gray.400" : "gray.400" },
          _focus: { borderColor: brand.primary, boxShadow: `0 0 0 1px ${brand.primary}` },
        }),
      },
    },
    Table: {
      variants: {
        simple: (props) => ({
          th: {
            bg: props.colorMode === "dark" ? "gray.700" : "gray.50",
            color: props.colorMode === "dark" ? "white" : "gray.600",
            borderColor: props.colorMode === "dark" ? "gray.600" : "gray.200",
          },
          td: {
            borderColor: props.colorMode === "dark" ? "gray.600" : "gray.200",
            color: props.colorMode === "dark" ? "white" : "gray.800",
          },
          thead: {
            bg: props.colorMode === "dark" ? "gray.700" : brand.primaryLight,
          },
        }),
      },
    },
    Modal: {
      baseStyle: (props) => ({
        dialog: {
          bg: props.colorMode === "dark" ? "gray.800" : "white",
          color: props.colorMode === "dark" ? "white" : "gray.800",
        },
        header: { color: props.colorMode === "dark" ? "white" : "gray.800" },
        body: { color: props.colorMode === "dark" ? "gray.300" : "gray.600" },
      }),
    },
    Menu: {
      baseStyle: (props) => ({
        list: {
          bg: props.colorMode === "dark" ? "gray.700" : "white",
          borderColor: props.colorMode === "dark" ? "gray.600" : "gray.200",
        },
        item: {
          bg: props.colorMode === "dark" ? "gray.700" : "white",
          color: props.colorMode === "dark" ? "white" : "gray.800",
          _hover: { bg: props.colorMode === "dark" ? "gray.600" : "gray.100" },
        },
      }),
    },
    Heading: {
      baseStyle: (props) => ({
        color: props.colorMode === "dark" ? "white" : "gray.800",
      }),
    },
    Drawer: {
      baseStyle: (props) => ({
        dialog: { bg: props.colorMode === "dark" ? "gray.800" : "white" },
      }),
    },
    Checkbox: {
      baseStyle: (props) => ({
        control: {
          bg: props.colorMode === "dark" ? "gray.700" : "white",
          borderColor: props.colorMode === "dark" ? "gray.500" : "gray.300",
          _checked: {
            bg: brand.primary,
            borderColor: brand.primary,
            _hover: { bg: brand.primaryHover, borderColor: brand.primaryHover },
          },
        },
        label: { color: props.colorMode === "dark" ? "white" : "gray.800" },
      }),
    },
    FormLabel: {
      baseStyle: (props) => ({
        color: props.colorMode === "dark" ? "gray.300" : "gray.700",
      }),
    },
    Button: {
      defaultProps: {
        colorScheme: "brand",
      },
    },
    Badge: {
      defaultProps: {
        colorScheme: "brand",
      },
    },
    Alert: {
      baseStyle: (props) => ({
        container: {
          bg: props.colorMode === "dark" ? "gray.700" : undefined,
        },
      }),
    },
    Card: {
      baseStyle: (props) => ({
        container: {
          bg: props.colorMode === "dark" ? "gray.800" : "white",
          color: props.colorMode === "dark" ? "white" : "gray.800",
        },
      }),
    },
  },
});

export default theme;
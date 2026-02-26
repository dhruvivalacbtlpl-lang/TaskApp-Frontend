import { extendTheme } from "@chakra-ui/react";

export const brand = {
  primary:      import.meta.env.VITE_PRIMARY_COLOR  || "#7c3aed",
  primaryLight: import.meta.env.VITE_PRIMARY_LIGHT  || "#f5f3ff",
  primaryHover: import.meta.env.VITE_PRIMARY_HOVER  || "#6d28d9",
  sidebar:      import.meta.env.VITE_SIDEBAR_COLOR  || "#7c3aed",
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
    accent: { 500: brand.accent },
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === "dark" ? "gray.900" : "gray.50",
        color: props.colorMode === "dark" ? "white" : "gray.800",
      },

      // ── Tables ──────────────────────────────────────────
      "table": {
        color: props.colorMode === "dark" ? "white" : "gray.800",
      },
      "th, td": {
        borderColor: props.colorMode === "dark" ? "#4a5568 !important" : "#e5e7eb !important",
        color: props.colorMode === "dark" ? "white !important" : "inherit",
      },
      "thead": {
        background: props.colorMode === "dark"
          ? "#2a4365 !important"
          : `${brand.primaryLight} !important`,
      },

      // ── Form elements ────────────────────────────────────
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

      // ── Fix ALL gray icon/action buttons in dark mode ────
      // This targets every gray solid button Chakra generates
      ...(props.colorMode === "dark" ? {
        ".chakra-icon-button, .chakra-button": {
          "&[class*='gray']": {
            background: "#4a5568 !important",
            color: "white !important",
          },
        },
        // Pagination, edit, delete buttons — force visible
        ".chakra-icon-button": {
          background: "#3d4a5c !important",
          color: "white !important",
          borderColor: "#4a5568 !important",
          "&:hover": {
            background: "#4a5568 !important",
          },
          // Red delete buttons — keep red
          "&[data-colorscheme='red'], &[class*='red']": {
            background: "#C53030 !important",
            color: "white !important",
            "&:hover": {
              background: "#9B2C2C !important",
            },
          },
        },
      } : {}),

      // ── Scrollbar ────────────────────────────────────────
      "::-webkit-scrollbar": { width: "6px", height: "6px" },
      "::-webkit-scrollbar-track": {
        background: props.colorMode === "dark" ? "#2d3748" : "#f1f1f1",
      },
      "::-webkit-scrollbar-thumb": {
        background: props.colorMode === "dark" ? "#4a5568" : "#c1c1c1",
        borderRadius: "3px",
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

    // ── Button ───────────────────────────────────────────
    Button: {
      defaultProps: { colorScheme: "brand" },
      variants: {
        ghost: (props) => ({
          color: props.colorMode === "dark" ? "gray.300" : "gray.600",
          _hover: {
            bg: props.colorMode === "dark" ? "whiteAlpha.200" : "gray.100",
            color: props.colorMode === "dark" ? "white" : "gray.800",
          },
        }),
        outline: (props) => ({
          borderColor: props.colorMode === "dark" ? "gray.500" : "gray.200",
          color: props.colorMode === "dark" ? "gray.200" : "gray.700",
          _hover: {
            bg: props.colorMode === "dark" ? "whiteAlpha.100" : "gray.50",
          },
        }),
      },
    },

    // ── IconButton ───────────────────────────────────────
    IconButton: {
      baseStyle: (props) => ({
        color: props.colorMode === "dark" ? "white" : "gray.700",
      }),
      variants: {
        solid: (props) => ({
          bg: props.colorMode === "dark" ? "#3d4a5c" : "gray.100",
          color: props.colorMode === "dark" ? "white" : "gray.700",
          _hover: {
            bg: props.colorMode === "dark" ? "#4a5568" : "gray.200",
          },
        }),
        ghost: (props) => ({
          color: props.colorMode === "dark" ? "gray.300" : "gray.600",
          _hover: {
            bg: props.colorMode === "dark" ? "whiteAlpha.200" : "gray.100",
            color: props.colorMode === "dark" ? "white" : "gray.800",
          },
        }),
        outline: (props) => ({
          color: props.colorMode === "dark" ? "gray.300" : "gray.600",
          borderColor: props.colorMode === "dark" ? "gray.500" : "gray.200",
          _hover: {
            bg: props.colorMode === "dark" ? "whiteAlpha.200" : "gray.100",
            color: props.colorMode === "dark" ? "white" : "gray.800",
          },
        }),
      },
    },

    Badge: {
      defaultProps: { colorScheme: "brand" },
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
          borderColor: props.colorMode === "dark" ? "gray.700" : "gray.200",
        },
      }),
    },
    Popover: {
      baseStyle: (props) => ({
        content: {
          bg: props.colorMode === "dark" ? "gray.700" : "white",
          borderColor: props.colorMode === "dark" ? "gray.600" : "gray.200",
          color: props.colorMode === "dark" ? "white" : "gray.800",
        },
      }),
    },
    Tooltip: {
      baseStyle: (props) => ({
        bg: props.colorMode === "dark" ? "gray.700" : "gray.700",
        color: "white",
      }),
    },
  },
});

export default theme;
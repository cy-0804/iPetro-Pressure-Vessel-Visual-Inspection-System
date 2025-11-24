import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "@mantine/core/styles.css";

import { MantineProvider, createTheme } from "@mantine/core";

import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";

// 1. Define your theme here
const theme = createTheme({
  colors: {
    // or replace default theme color
    primary: [
      "#e2ffff",
      "#d1fafa",
      "#a7f2f4",
      "#79ebed",
      "#56e5e7",
      "#3fe1e4",
      "#2edfe2",
      "#1ac6c9",
      "#00b0b3",
      "#00999c",
    ],
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <RouterProvider router={router} />
    </MantineProvider>
  </StrictMode>
);

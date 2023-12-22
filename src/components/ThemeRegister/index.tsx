"use client";
import "./index.css";

import { ThemeProvider } from "@emotion/react";
import { Container, CssBaseline, PaletteMode } from "@mui/material";
import { useCookieState } from "ahooks";
import { ReactNode, useMemo, useState } from "react";
import ColorModeContext from "@/contexts/colorModeContext";
import Header from "../Header";
import themeRegister from "./theme";

interface IAppProps {
  children: ReactNode;
  themeMode: PaletteMode;
}
export default function ThemeRegister({ children, themeMode }: IAppProps) {
  const [mode, setMode] = useState<PaletteMode>(themeMode);

  const [, setThemeMode] = useCookieState("theme-mode", {
    defaultValue: "dark",
  });

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
        setThemeMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
    }),
    [setThemeMode],
  );

  const theme = useMemo(() => themeRegister(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        {/* <CssBaseline /> */}

        <body id="__next">
          <Header />
          <div
            className="main"
          >
            {children}
          </div>
        </body>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

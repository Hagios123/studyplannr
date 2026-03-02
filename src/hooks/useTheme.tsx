import { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
type ColorTheme = "blue" | "green" | "red" | "grey";

interface ThemeContext {
  mode: Mode;
  setMode: (m: Mode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (c: ColorTheme) => void;
  resolvedMode: "light" | "dark";
}

const ThemeCtx = createContext<ThemeContext>({
  mode: "system",
  setMode: () => {},
  colorTheme: "blue",
  setColorTheme: () => {},
  resolvedMode: "dark",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => (localStorage.getItem("novastudy_mode") as Mode) || "system");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => (localStorage.getItem("novastudy_color") as ColorTheme) || "blue");
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedMode = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedMode);
    root.setAttribute("data-color-theme", colorTheme);
  }, [resolvedMode, colorTheme]);

  const setMode = (m: Mode) => { localStorage.setItem("novastudy_mode", m); setModeState(m); };
  const setColorTheme = (c: ColorTheme) => { localStorage.setItem("novastudy_color", c); setColorThemeState(c); };

  return (
    <ThemeCtx.Provider value={{ mode, setMode, colorTheme, setColorTheme, resolvedMode }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

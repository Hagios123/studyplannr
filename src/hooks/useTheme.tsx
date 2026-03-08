import { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
type ColorTheme = "blue" | "green" | "red" | "grey";
type FontSize = "normal" | "large" | "xl";

interface ThemeContext {
  mode: Mode;
  setMode: (m: Mode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (c: ColorTheme) => void;
  resolvedMode: "light" | "dark";
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  dyslexicFont: boolean;
  setDyslexicFont: (v: boolean) => void;
}

const ThemeCtx = createContext<ThemeContext>({
  mode: "system",
  setMode: () => {},
  colorTheme: "blue",
  setColorTheme: () => {},
  resolvedMode: "dark",
  fontSize: "normal",
  setFontSize: () => {},
  reducedMotion: false,
  setReducedMotion: () => {},
  highContrast: false,
  setHighContrast: () => {},
  dyslexicFont: false,
  setDyslexicFont: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => (localStorage.getItem("studyai_mode") as Mode) || "system");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => (localStorage.getItem("studyai_color") as ColorTheme) || "blue");
  const [fontSize, setFontSizeState] = useState<FontSize>(() => (localStorage.getItem("studyai_fontsize") as FontSize) || "normal");
  const [reducedMotion, setReducedMotionState] = useState(() => localStorage.getItem("studyai_reduced_motion") === "true");
  const [highContrast, setHighContrastState] = useState(() => localStorage.getItem("studyai_high_contrast") === "true");
  const [dyslexicFont, setDyslexicFontState] = useState(() => localStorage.getItem("studyai_dyslexic") === "true");
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

    // Font size
    root.classList.remove("text-size-normal", "text-size-large", "text-size-xl");
    root.classList.add(`text-size-${fontSize}`);

    // Reduced motion
    root.classList.toggle("reduce-motion", reducedMotion);

    // High contrast
    root.classList.toggle("high-contrast", highContrast);

    // Dyslexic font
    root.classList.toggle("dyslexic-font", dyslexicFont);
  }, [resolvedMode, colorTheme, fontSize, reducedMotion, highContrast, dyslexicFont]);

  const setMode = (m: Mode) => { localStorage.setItem("studyai_mode", m); setModeState(m); };
  const setColorTheme = (c: ColorTheme) => { localStorage.setItem("studyai_color", c); setColorThemeState(c); };
  const setFontSize = (s: FontSize) => { localStorage.setItem("studyai_fontsize", s); setFontSizeState(s); };
  const setReducedMotion = (v: boolean) => { localStorage.setItem("studyai_reduced_motion", String(v)); setReducedMotionState(v); };
  const setHighContrast = (v: boolean) => { localStorage.setItem("studyai_high_contrast", String(v)); setHighContrastState(v); };
  const setDyslexicFont = (v: boolean) => { localStorage.setItem("studyai_dyslexic", String(v)); setDyslexicFontState(v); };

  return (
    <ThemeCtx.Provider value={{
      mode, setMode, colorTheme, setColorTheme, resolvedMode,
      fontSize, setFontSize, reducedMotion, setReducedMotion,
      highContrast, setHighContrast, dyslexicFont, setDyslexicFont,
    }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

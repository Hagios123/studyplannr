import { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
type ColorTheme = "blue" | "green" | "red" | "grey" | "purple";
type FontSize = "normal" | "large" | "xl";
type LineSpacing = "compact" | "normal" | "relaxed";
type UiStyle = "normal" | "cyberpunk" | "retro" | "glass" | "minimal" | "steampunk";

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
  lineSpacing: LineSpacing;
  setLineSpacing: (v: LineSpacing) => void;
  focusHighlight: boolean;
  setFocusHighlight: (v: boolean) => void;
  colorBlindMode: boolean;
  setColorBlindMode: (v: boolean) => void;
  screenReaderHints: boolean;
  setScreenReaderHints: (v: boolean) => void;
  largeCursor: boolean;
  setLargeCursor: (v: boolean) => void;
  uiStyle: UiStyle;
  setUiStyle: (v: UiStyle) => void;
}

const ThemeCtx = createContext<ThemeContext>({
  mode: "system", setMode: () => {},
  colorTheme: "blue", setColorTheme: () => {},
  resolvedMode: "dark",
  fontSize: "normal", setFontSize: () => {},
  reducedMotion: false, setReducedMotion: () => {},
  highContrast: false, setHighContrast: () => {},
  dyslexicFont: false, setDyslexicFont: () => {},
  lineSpacing: "normal", setLineSpacing: () => {},
  focusHighlight: false, setFocusHighlight: () => {},
  colorBlindMode: false, setColorBlindMode: () => {},
  screenReaderHints: false, setScreenReaderHints: () => {},
  largeCursor: false, setLargeCursor: () => {},
  uiStyle: "normal", setUiStyle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => (localStorage.getItem("studyai_mode") as Mode) || "system");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => (localStorage.getItem("studyai_color") as ColorTheme) || "blue");
  const [fontSize, setFontSizeState] = useState<FontSize>(() => (localStorage.getItem("studyai_fontsize") as FontSize) || "normal");
  const [reducedMotion, setReducedMotionState] = useState(() => localStorage.getItem("studyai_reduced_motion") === "true");
  const [highContrast, setHighContrastState] = useState(() => localStorage.getItem("studyai_high_contrast") === "true");
  const [dyslexicFont, setDyslexicFontState] = useState(() => localStorage.getItem("studyai_dyslexic") === "true");
  const [lineSpacing, setLineSpacingState] = useState<LineSpacing>(() => (localStorage.getItem("studyai_linespacing") as LineSpacing) || "normal");
  const [focusHighlight, setFocusHighlightState] = useState(() => localStorage.getItem("studyai_focus_highlight") === "true");
  const [colorBlindMode, setColorBlindModeState] = useState(() => localStorage.getItem("studyai_colorblind") === "true");
  const [screenReaderHints, setScreenReaderHintsState] = useState(() => localStorage.getItem("studyai_sr_hints") === "true");
  const [largeCursor, setLargeCursorState] = useState(() => localStorage.getItem("studyai_large_cursor") === "true");
  const [uiStyle, setUiStyleState] = useState<UiStyle>(() => (localStorage.getItem("studyai_ui_style") as UiStyle) || "normal");
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
    root.setAttribute("data-ui-style", uiStyle);

    root.classList.remove("text-size-normal", "text-size-large", "text-size-xl");
    root.classList.add(`text-size-${fontSize}`);
    root.classList.remove("line-spacing-compact", "line-spacing-normal", "line-spacing-relaxed");
    root.classList.add(`line-spacing-${lineSpacing}`);
    root.classList.toggle("reduce-motion", reducedMotion);
    root.classList.toggle("high-contrast", highContrast);
    root.classList.toggle("dyslexic-font", dyslexicFont);
    root.classList.toggle("focus-highlight", focusHighlight);
    root.classList.toggle("colorblind-mode", colorBlindMode);
    root.classList.toggle("sr-hints", screenReaderHints);
    root.classList.toggle("large-cursor", largeCursor);
    root.classList.toggle("ui-cyberpunk", uiStyle === "cyberpunk");
    root.classList.toggle("ui-retro", uiStyle === "retro");
    root.classList.toggle("ui-glass", uiStyle === "glass");
    root.classList.toggle("ui-minimal", uiStyle === "minimal");
  }, [resolvedMode, colorTheme, fontSize, reducedMotion, highContrast, dyslexicFont, lineSpacing, focusHighlight, colorBlindMode, screenReaderHints, largeCursor, uiStyle]);

  const persist = (key: string, val: string) => localStorage.setItem(key, val);

  const setMode = (m: Mode) => { persist("studyai_mode", m); setModeState(m); };
  const setColorTheme = (c: ColorTheme) => { persist("studyai_color", c); setColorThemeState(c); };
  const setFontSize = (s: FontSize) => { persist("studyai_fontsize", s); setFontSizeState(s); };
  const setReducedMotion = (v: boolean) => { persist("studyai_reduced_motion", String(v)); setReducedMotionState(v); };
  const setHighContrast = (v: boolean) => { persist("studyai_high_contrast", String(v)); setHighContrastState(v); };
  const setDyslexicFont = (v: boolean) => { persist("studyai_dyslexic", String(v)); setDyslexicFontState(v); };
  const setLineSpacing = (v: LineSpacing) => { persist("studyai_linespacing", v); setLineSpacingState(v); };
  const setFocusHighlight = (v: boolean) => { persist("studyai_focus_highlight", String(v)); setFocusHighlightState(v); };
  const setColorBlindMode = (v: boolean) => { persist("studyai_colorblind", String(v)); setColorBlindModeState(v); };
  const setScreenReaderHints = (v: boolean) => { persist("studyai_sr_hints", String(v)); setScreenReaderHintsState(v); };
  const setLargeCursor = (v: boolean) => { persist("studyai_large_cursor", String(v)); setLargeCursorState(v); };
  const setUiStyle = (v: UiStyle) => { persist("studyai_ui_style", v); setUiStyleState(v); };

  return (
    <ThemeCtx.Provider value={{
      mode, setMode, colorTheme, setColorTheme, resolvedMode,
      fontSize, setFontSize, reducedMotion, setReducedMotion,
      highContrast, setHighContrast, dyslexicFont, setDyslexicFont,
      lineSpacing, setLineSpacing, focusHighlight, setFocusHighlight,
      colorBlindMode, setColorBlindMode, screenReaderHints, setScreenReaderHints,
      largeCursor, setLargeCursor, uiStyle, setUiStyle,
    }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

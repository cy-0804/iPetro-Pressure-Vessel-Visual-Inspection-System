import { createContext, useContext, useState, useEffect } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [colorScheme, setColorScheme] = useState(() => {
    return localStorage.getItem("mantine-color-scheme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-mantine-color-scheme", colorScheme);
  }, [colorScheme]);

  const changeTheme = (newTheme) => {
    setColorScheme(newTheme);
    localStorage.setItem("mantine-color-scheme", newTheme);
    document.documentElement.setAttribute("data-mantine-color-scheme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
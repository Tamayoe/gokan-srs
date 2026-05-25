import { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

interface ThemeProviderState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
};

const ThemeContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
            }
        } catch (e) {
            console.warn("localStorage not available in this environment", e);
        }
        return defaultTheme;
    });

    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        try {
            const root = window.document.documentElement;
            root.classList.remove("light", "dark");

            if (theme === "system") {
                const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                    .matches
                    ? "dark"
                    : "light";

                root.classList.add(systemTheme);
                return;
            }

            root.classList.add(theme);
        } catch (e) {
            console.error("Failed to update theme classes", e);
        }
    }, [theme]);

    const value = {
        theme,
        setTheme: (newTheme: Theme) => {
            try {
                if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                    localStorage.setItem(storageKey, newTheme);
                }
            } catch (e) {
                console.warn("Failed to persist theme", e);
            }
            setTheme(newTheme);
        },
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );

    // Helper to avoid passing props explicitly if not needed, but cleaner to just pass value
    // Actually, I spread {...props} above which is weird because props isn't defined in the args except children/etc.
    // Let me fix the return statement in the file generation.
}

export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};

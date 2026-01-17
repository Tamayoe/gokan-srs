import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { QuizProvider } from "./context/QuizContext"
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleDriveProvider } from "./context/GoogleDriveContext";
import { ThemeProvider } from "./context/ThemeContext";
import { App } from './App';


// Import Google Fonts
export const FONT_IMPORTS = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Sawarabi+Gothic&display=swap');
`;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <style>{FONT_IMPORTS}</style>
        <ThemeProvider defaultTheme="system" storageKey="gokan-theme">
            <GoogleOAuthProvider clientId="1088130501377-pe580cj85dt179hltgba6v153m12esmh.apps.googleusercontent.com">
                <GoogleDriveProvider>
                    <QuizProvider>
                        <App />
                    </QuizProvider>
                </GoogleDriveProvider>
            </GoogleOAuthProvider>
        </ThemeProvider>
    </StrictMode>
);
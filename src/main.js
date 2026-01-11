import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from "./App";
import { QuizProvider } from "./context/QuizContext";
// Import Google Fonts
export const FONT_IMPORTS = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Sawarabi+Gothic&display=swap');
`;
createRoot(document.getElementById('root')).render(_jsxs(StrictMode, { children: [_jsx("style", { children: FONT_IMPORTS }), _jsx(QuizProvider, { children: _jsx(App, {}) })] }));

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {StorageService} from "./services/storage.service.ts";
import {App} from "./App.tsx";


// Import Google Fonts
export const FONT_IMPORTS = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Sawarabi+Gothic&display=swap');
`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App user={StorageService.loadProgress()}/>
  </StrictMode>,
)

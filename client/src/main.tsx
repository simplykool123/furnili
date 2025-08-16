import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('main.tsx - Starting React app...');
const rootElement = document.getElementById("root");
console.log('main.tsx - Root element found:', !!rootElement);

if (rootElement) {
  try {
    createRoot(rootElement).render(<App />);
    console.log('main.tsx - React app rendered successfully');
  } catch (error) {
    console.error('main.tsx - Error rendering app:', error);
    // Fallback: render a simple error message
    rootElement.innerHTML = '<div style="padding: 20px; color: red; font-family: Arial;">Error loading application. Check console for details.</div>';
  }
} else {
  console.error('main.tsx - Root element not found!');
}

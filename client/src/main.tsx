import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/fonts.css";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found. Please check your index.html file.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
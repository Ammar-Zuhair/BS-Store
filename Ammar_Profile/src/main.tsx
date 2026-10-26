import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./styles.css";
const root = document.getElementById("root")!;
const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
if (root.hasAttribute("data-prerendered")) hydrateRoot(root, app);
else createRoot(root).render(app);

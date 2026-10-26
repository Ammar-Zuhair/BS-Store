import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "./App";
export function render(path: string) {
  return renderToString(
    <StaticRouter location={path}>
      <App />
    </StaticRouter>,
  );
}
export { pageMetadata, structuredData } from "./lib/seo";
export { projects } from "./data/projects";

import { createRoot } from "react-dom/client";
import { HeadContent, RouterProvider } from "@tanstack/react-router";
import { getRouter } from "../src/router";
import { Route as rootRoute } from "../src/routes/__root";
import "../src/styles.css";

// Static HTML already owns html/head/body; do not mount Start's SSR document shell.
rootRoute.update({
  shellComponent: ({ children }) => (
    <>
      {children}
      <HeadContent />
    </>
  ),
});

const container = document.getElementById("root");
if (container) createRoot(container).render(<RouterProvider router={getRouter()} />);

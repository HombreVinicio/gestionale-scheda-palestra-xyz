import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "../src/router";
import "../src/styles.css";

const container = document.getElementById("root");
if (container) createRoot(container).render(<RouterProvider router={getRouter()} />);

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: "pages",
  base: process.env["PAGES_BASE_PATH"] || "/",
  publicDir: "../public",
  plugins: [
    react(),
    tailwind(),
    {
      name: "github-pages-route-entries",
      closeBundle() {
        const output = resolve(projectRoot, "dist-pages");
        const index = resolve(output, "index.html");
        // Generate identical entries locally and in Actions, without SPA rewrites.
        const routes = resolve(projectRoot, "src/routes");
        for (const file of readdirSync(routes, { recursive: true })) {
          if (typeof file !== "string" || !file.endsWith(".tsx")) continue;
          const source = readFileSync(resolve(routes, file), "utf8");
          const path = /createFileRoute\(["']([^"']+)["']\)/.exec(source)?.[1];
          if (!path || path === "/" || /[$_]/.test(path)) continue;
          const destination = resolve(output, path.replace(/^\//, ""));
          mkdirSync(destination, { recursive: true });
          copyFileSync(index, resolve(destination, "index.html"));
        }
        copyFileSync(index, resolve(output, "404.html"));
        writeFileSync(resolve(output, ".nojekyll"), "");
      },
    },
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "../dist-pages", emptyOutDir: true },
});

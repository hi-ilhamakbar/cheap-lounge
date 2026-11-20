// Optional, for developers only: rebuild assets/css/app.css after changing classes in PHP/JS.
// Requires Node.js + `npm i tailwindcss@4` in dev/. The compiled CSS is committed, so the live server needs nothing.
//   cd dev && npm i tailwindcss@4 && node build-css.mjs
import { compile } from "tailwindcss";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const twDir = path.dirname(require.resolve("tailwindcss/package.json"));
const input = fs.readFileSync(path.join(root, "dev/tailwind/input.css"), "utf8");

const compiler = await compile(input, {
  base: root,
  loadStylesheet: async (id, base) => {
    const file = id === "tailwindcss" ? path.join(twDir, "index.css") : path.resolve(base, id);
    return { path: file, base: path.dirname(file), content: fs.readFileSync(file, "utf8") };
  },
});

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (["vendor", "storage", "dev", ".git", "node_modules"].includes(f)) continue;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(php|js)$/.test(f)) files.push(p);
  }
})(root);

const candidates = new Set();
for (const f of files) for (const m of fs.readFileSync(f, "utf8").matchAll(/[A-Za-z0-9_\-:\/\[\]\.%#!()=,&>+~*@]+/g)) candidates.add(m[0]);
const css = compiler.build([...candidates]);
fs.writeFileSync(path.join(root, "assets/css/app.css"), css);
console.log(`assets/css/app.css written (${css.length} bytes from ${files.length} files)`);

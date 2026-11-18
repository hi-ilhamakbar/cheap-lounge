// Builds cpanel-upload/: the minimal files to upload to a cPanel "Setup Node.js App" folder.
// Run with: npm run build:cpanel   (on your own computer — shared hosts often lack RAM for `next build`)
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";

const out = "cpanel-upload";
if (!existsSync(".next/standalone/server.js")) {
  console.error('Missing .next/standalone — check next.config.ts has output: "standalone".');
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
cpSync(".next/standalone", out, { recursive: true });
cpSync(".next/static", `${out}/.next/static`, { recursive: true });
cpSync("public", `${out}/public`, { recursive: true });
// Never ship local secrets — set them in cPanel's Environment Variables instead.
for (const f of [".env", ".env.local", ".env.production", ".env.production.local"]) rmSync(`${out}/${f}`, { force: true });
writeFileSync(
  `${out}/README-CPANEL.txt`,
  "Upload this folder's contents to the Node.js app root (NOT public_html).\nApplication startup file: server.js\nSet environment variables in cPanel > Setup Node.js App.\n",
);
console.log(`Ready: ${out}/  → zip it and upload to the Node.js application root.`);

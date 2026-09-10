/**
 * vscode.l10n.t() に渡している文言と l10n/bundle.l10n.*.json の対応、
 * package.json の %key% と package.nls*.json の対応を検証する。
 * 翻訳漏れ・使われなくなったキーがあれば異常終了する。
 */
const fs = require("fs");
const path = require("path");

let failed = false;
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  failed = true;
};

// --- 実行時文言（vscode.l10n.t） ---
const used = new Set();
for (const file of fs.readdirSync("src")) {
  const source = fs.readFileSync(path.join("src", file), "utf8");
  for (const m of source.matchAll(/vscode\.l10n\.t\(\s*"((?:[^"\\]|\\.)*)"/g)) {
    used.add(m[1]);
  }
}
for (const file of fs.readdirSync("l10n")) {
  const bundle = JSON.parse(fs.readFileSync(path.join("l10n", file), "utf8"));
  for (const key of used) {
    if (!(key in bundle)) fail(`${file}: missing translation for ${JSON.stringify(key)}`);
  }
  for (const key of Object.keys(bundle)) {
    if (!used.has(key)) fail(`${file}: unused key ${JSON.stringify(key)}`);
  }
}

// --- package.json の %key% ---
const manifest = fs.readFileSync("package.json", "utf8");
const placeholders = new Set([...manifest.matchAll(/%([a-zA-Z0-9_.]+)%/g)].map((m) => m[1]));
const nlsFiles = fs.readdirSync(".").filter((f) => /^package\.nls(\.[\w-]+)?\.json$/.test(f));
for (const file of nlsFiles) {
  const nls = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const key of placeholders) {
    if (!(key in nls)) fail(`${file}: missing entry for %${key}%`);
  }
  for (const key of Object.keys(nls)) {
    if (!placeholders.has(key)) fail(`${file}: unused entry ${key}`);
  }
}

if (failed) process.exit(1);
console.log(
  `✓ l10n OK — ${used.size} runtime strings, ${placeholders.size} manifest keys, ` +
    `bundles: ${fs.readdirSync("l10n").join(", ")}, ${nlsFiles.join(", ")}`
);

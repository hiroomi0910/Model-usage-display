/**
 * CHANGELOG.md から指定バージョンの節を切り出し、GitHub Release の本文として出力する。
 * 使い方: node scripts/release-notes.js 1.2.0 > release-notes.md
 * 該当する節が無ければ異常終了する（CHANGELOG の更新漏れのままリリースさせないため）。
 */
const fs = require("fs");

const version = (process.argv[2] || "").replace(/^v/, "");
if (!version) {
  console.error("usage: node scripts/release-notes.js <version>");
  process.exit(2);
}

const lines = fs.readFileSync("CHANGELOG.md", "utf8").split(/\r?\n/);
const escaped = version.replace(/\./g, "\\.");
const start = lines.findIndex((line) => new RegExp(`^## ${escaped}(\\s|$)`).test(line));
if (start === -1) {
  console.error(`CHANGELOG.md に "## ${version}" の節がありません`);
  process.exit(1);
}
let end = lines.findIndex((line, i) => i > start && /^## /.test(line));
if (end === -1) end = lines.length;

const section = lines.slice(start + 1, end).join("\n").trim();
if (!section) {
  console.error(`CHANGELOG.md の "## ${version}" の節が空です`);
  process.exit(1);
}

process.stdout.write(`${section}

---

**インストール**: \`model-usage-display-${version}.vsix\` をダウンロードし、拡張機能ビュー → \`…\` メニュー → 「VSIXからのインストール」で選択。
`);

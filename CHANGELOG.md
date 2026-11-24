# Changelog

## 1.2.5 — 2026-11-25

ドキュメントの更新のみ。拡張機能の動作に変更はありません。

- README の表示例とグループ表示の例のモデル名を、今の Antigravity が返す一覧（Claude Opus 5.5、Gemini 4 Hydrogen など）に合わせて更新

## 1.2.4 — 2026-11-24

- **新しい Antigravity で「Language Server に接続できません」になる問題を修正**。Antigravity 2.34 前後から、CSRF トークンがコマンドラインの `--csrf_token` ではなく環境変数 `ANTIGRAVITY_SERVER_CSRF_TOKEN` で渡されるようになり、トークンを見つけられなくなっていた。コマンドラインに無いときは `ps eww` で環境変数から読むようにした（macOS/Linux）。旧版の検出はそのまま
- Windows では他のプロセスの環境変数を読めないため、トークンを環境変数で渡す新しい版にはまだ対応していない
- README の「仕組み」と「OS」に上記を追記

## 1.2.3 — 2026-11-10

公開まわりのメンテナンスリリース。拡張機能の動作に変更はありません。

- Visual Studio Marketplace への公開を Microsoft Entra ID 認証で行う（Azure DevOps の全組織対象 PAT が 2026-12-01 に廃止されるため。ワークフローは 1.2.2 で切り替え済みだったが、設定が間に合わず 1.2.2 は Marketplace に公開されなかった）。このバージョンで Open VSX と Marketplace の両方に公開する
- リリースの再実行で、公開済みのバージョンを飛ばすようにした（Open VSX は `skipDuplicate`、Marketplace は `--skip-duplicate`）

## 1.2.2 — 2026-11-04

- **新しい Antigravity で「Antigravity Language Server が見つかりません」になる問題を修正**。Language Server 2.29 以降はプロセスが `~/.gemini/bin/agy --hub` として動き、名前に `language_server` を含まないため検出できていなかった。`agy`（Windows では `agy.exe`）のプロセスも検出するようにした。旧版の検出はそのまま
- README の「仕組み」に上記を追記

## 1.2.1 — 2026-10-22

セキュリティ対応のメンテナンスリリース。拡張機能の動作に変更はありません。

- GitHub Actions（CI・リリース）の Node.js を、サポートが終了した 20 から 24 に更新
- 開発用依存の脆弱性を修正（`npm audit fix` で brace-expansion・qs・undici を更新）

## 1.2.0 — 2026-09-11

マーケットプレイス（Open VSX / Visual Studio Marketplace）公開のための準備。

- **UI文言を英語に変更し、日本語ローカライズを同梱**（`package.nls.json` / `vscode.l10n`）。エディタの表示言語に追従するため、日本語環境では従来どおり日本語で表示される
- README を英語（`README.md`）と日本語（`README.ja.md`）に分割
- `categories` に `Visualization` を追加し、マーケットプレイス表示用のメタデータ（`galleryBanner`・`homepage`・`bugs`・`qna`・`pricing`）を設定
- `package.json` から `"private": true` を削除
- タグ push で VSIX ビルド → GitHub Release 作成 → 各マーケットプレイスへ公開する GitHub Actions を追加
- 内部変更: 取得エラーに識別子（`code`）を持たせ、文言の解決を表示側（`src/errorText.ts`）に集約。`languageServerClient` と `format` の vscode 非依存性を維持

## 1.1.1 — 2026-07-08

- README に前提条件（同一マシンに Antigravity IDE がインストール・起動済みであること）を明記
- Language Server が見つからない場合のエラーメッセージを、Antigravity IDE 未インストール環境でも原因がわかる文言に変更

## 1.1.0 — 2026-07-08

- **Windows対応**: プロセス検出を PowerShell（`Get-CimInstance`）、ポート列挙を `netstat` で行うようにした（従来は `ps` / `lsof` 前提でWindowsでは「接続不可」になっていた）
- Linux向けに `lsof` が無い環境での `ss` フォールバックを追加（未検証）
- README を「VSCode・VSCode系IDE全般で使える拡張」として再構成

## 1.0.0 — 2026-07-08

初回リリース。

- Antigravity Language Server への直接接続によるクォータ取得（追加ログイン不要・ローカル完結）
- ステータスバーに最も残量が少ないモデルの残量%を常時表示（しきい値で警告色・危険色）
- ステータスバークリックで全モデルの詳細表示（プログレスバー＋残量%＋リセットまでの時間）
- 自動更新（ポーリング間隔は設定可能、デフォルト60秒）
- しきい値通知・リセット時刻通知（設定でオン・オフ可能）
- 非表示モデルの設定
- 拡張アイコン（速度計/燃料計モチーフ）。ステータスバーは ⚡（zap）で他のクォータ系拡張と区別
- Antigravity IDE 以外のVSCode系エディタでも動作（クォータ取得にはAntigravityの起動が必要）

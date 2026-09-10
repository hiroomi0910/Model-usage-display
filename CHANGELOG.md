# Changelog

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

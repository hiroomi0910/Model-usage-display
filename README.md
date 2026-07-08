# Model Usage Display

Antigravity IDE の各AIモデル（Gemini / Claude / GPT系）のクォータ残量とリセットまでの時間を、ステータスバーに常時表示するVSCode拡張。

## 機能

- **ステータスバー**: 最も残量が少ないモデルの残量%を常時表示。ホバーで全モデルの一覧
- **詳細ダッシュボード**: ステータスバークリックで全モデルのプログレスバー＋残量%＋リセットまでの時間を表示
- **自動更新**: 設定可能なポーリング間隔（デフォルト60秒）
- **色分け**: 残量30%以下で警告色、10%以下で危険色（しきい値は設定可能）
- **しきい値通知**: 残量がしきい値を下回ったとき通知
- **リセット通知**: クォータのリセット時刻になったとき通知

```
Models
──────────
Claude Opus 4.6
■■■■□□□□□□ 45%  ↻ 3h21m

Gemini 3.1 Pro
■■■■■■■□□□ 71%  ↻ 2h05m
```

## 仕組み

Antigravity IDE が内部で起動している Language Server に直接接続してクォータを取得する（追加ログイン不要・ローカル完結）:

1. `ps` でプロセス一覧から `language_server` を探し `--csrf_token` を抽出
2. `lsof` でそのプロセスの LISTEN ポートを列挙
3. 各ポートに `X-Codeium-Csrf-Token` ヘッダー付きで Connect RPC
   `/exa.language_server_pb.LanguageServerService/GetUserStatus` を POST

内部仕様は流動的なため、サーバーが返す `remainingFraction` / `resetTime` をそのまま表示し、クォータの意味論（5時間ローリング・週次上限など）の解釈はしない。

同一クォータプールのバリアント（例: `Gemini 3.5 Flash (Low/Medium/High)`）は1つのグループにまとめて表示する。

## インストール

```sh
npm install
npm run compile
npm run package   # model-usage-display-0.1.0.vsix が生成される
```

Antigravity IDE で: 拡張機能ビュー → `…` メニュー → **VSIXからのインストール** → 生成された `.vsix` を選択。

## 設定

| キー | デフォルト | 説明 |
|---|---|---|
| `modelUsageDisplay.pollIntervalSeconds` | `60` | 自動更新間隔（秒、最小10） |
| `modelUsageDisplay.warnThresholdPercent` | `30` | 警告色にする残量% |
| `modelUsageDisplay.dangerThresholdPercent` | `10` | 危険色にする残量% |
| `modelUsageDisplay.notifyOnThreshold` | `true` | しきい値通知のオン・オフ |
| `modelUsageDisplay.notifyOnReset` | `true` | リセット時刻通知のオン・オフ |
| `modelUsageDisplay.hiddenModels` | `[]` | 非表示にするモデル名の配列 |

## コマンド

- `Model Usage: 詳細を表示` — ダッシュボードを開く（ステータスバークリックと同じ）
- `Model Usage: 今すぐ更新` — 手動更新

## 制約

- Antigravity IDE が起動している必要がある（IDE内のLanguage Serverに接続するため）
- macOS のみ動作確認済み（ポート検出に `ps` / `lsof` を使用）
- Antigravity の内部実装依存のため、アップデートで取得方法が壊れる可能性あり

## 参考にしたOSS

- [antigravity-usage](https://github.com/skainguyen1412/antigravity-usage) — 接続方式（CSRFトークン検出・Connect RPC）
- [AntigravityQuotaWatcher](https://github.com/wusimpl/AntigravityQuotaWatcher)
- [antigravity-usage-monitor](https://github.com/tuckiestudio/antigravity-usage-monitor)

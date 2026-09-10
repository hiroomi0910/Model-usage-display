# Model Usage Display

[English](https://github.com/hiroomi0910/Model-usage-display/blob/main/README.md) | **日本語**

Antigravity の各AIモデル（Gemini / Claude / GPT系）のクォータ残量とリセットまでの時間を、ステータスバーに常時表示する拡張。**VSCode・Antigravity IDE をはじめとするVSCode系IDE全般**にインストールできる。

> [!IMPORTANT]
> **前提条件: Antigravity IDE が必須。**
> この拡張はマシン上で動いている Antigravity の Language Server からクォータを取得する。そのため、どのエディタにインストールした場合でも、**同じマシンに [Antigravity IDE](https://antigravity.google/) がインストールされ、起動している（＝ログイン済みでLanguage Serverが動いている）ことが必要**。Antigravity が無い・起動していない環境では「Antigravity Language Server が見つかりません」というエラーになる。

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

1. プロセス一覧から `language_server` を探し `--csrf_token` を抽出
   （macOS/Linux: `ps`、Windows: PowerShell `Get-CimInstance`）
2. そのプロセスの LISTEN ポートを列挙
   （macOS/Linux: `lsof`、Windows: `netstat`）
3. 各ポートに `X-Codeium-Csrf-Token` ヘッダー付きで Connect RPC
   `/exa.language_server_pb.LanguageServerService/GetUserStatus` を POST

内部仕様は流動的なため、サーバーが返す `remainingFraction` / `resetTime` をそのまま表示し、クォータの意味論（5時間ローリング・週次上限など）の解釈はしない。

同一クォータプールのバリアント（例: `Gemini 3.5 Flash (Low/Medium/High)`）は1つのグループにまとめて表示する。

## インストール

### VSIX から

事前に [Antigravity IDE](https://antigravity.google/) をインストールしておく（前提条件を参照）。その上で [Releases](https://github.com/hiroomi0910/Model-usage-display/releases) から `.vsix` をダウンロードし、お使いのエディタ（VSCode / Antigravity IDE / その他VSCode系IDE）で: 拡張機能ビュー → `…` メニュー → **VSIXからのインストール** → ダウンロードした `.vsix` を選択。

またはCLIで（`code` の部分は各エディタのCLI名に読み替え）:

```sh
code --install-extension model-usage-display-x.y.z.vsix
```

macOSでCLIがPATHにない場合のフルパス例:

```sh
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension model-usage-display-x.y.z.vsix
"/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" --install-extension model-usage-display-x.y.z.vsix
```

### ソースからビルド

```sh
npm install
npm run compile
npm run package   # model-usage-display-x.y.z.vsix が生成される
```

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

## 対応環境

- **エディタ**: VSCode 1.74以降、および Antigravity IDE 等のVSCode系IDE。クォータの取得元はエディタ自身ではなく「マシン上で動いているAntigravityのLanguage Serverプロセス」なので、どのエディタから使う場合も **Antigravity IDE が起動していることが前提**
- **OS**: macOS・Windows（いずれも動作確認済み）。Linuxは実装済みだが未検証
- **表示言語**: 英語（既定）と日本語。エディタの表示言語に追従する

## 制約・免責

- Antigravity IDE が起動している必要がある（IDE内のLanguage Serverに接続するため。拡張を他のエディタに入れた場合も同様）
- Antigravity の**非公開の内部APIに依存**しているため、IDEのアップデートで予告なく動かなくなる可能性がある。本拡張はGoogle非公式の個人プロジェクトであり、無保証（MITライセンス）
- 通信はすべて `127.0.0.1`（ローカルのLanguage Server）に対してのみ行う。外部サーバーへの送信・テレメトリは一切ない

## プライバシー

この拡張が扱うのはLanguage Serverが返すクォータ情報（モデル名・残量・リセット時刻）のみ。取得したデータはメモリ上に保持するだけで、ディスク保存・外部送信はしない。

## 参考にしたOSS

- [antigravity-usage](https://github.com/skainguyen1412/antigravity-usage) — 接続方式（CSRFトークン検出・Connect RPC）
- [AntigravityQuotaWatcher](https://github.com/wusimpl/AntigravityQuotaWatcher)
- [antigravity-usage-monitor](https://github.com/tuckiestudio/antigravity-usage-monitor)

## ライセンス

[MIT](https://github.com/hiroomi0910/Model-usage-display/blob/main/LICENSE)

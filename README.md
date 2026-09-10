# Model Usage Display

**English** | [日本語](https://github.com/hiroomi0910/Model-usage-display/blob/main/README.ja.md)

Keeps the remaining quota and time-until-reset of each Antigravity AI model (Gemini / Claude / GPT) visible in your status bar. Installable in **VS Code, Antigravity IDE, and other VS Code-based editors**.

> [!IMPORTANT]
> **Prerequisite: Antigravity IDE is required.**
> This extension reads quota from the Antigravity Language Server running on your machine. So no matter which editor you install it into, [Antigravity IDE](https://antigravity.google/) must be **installed on the same machine and running** (signed in, with its Language Server up). Without it you will see the error "Antigravity Language Server not found".

## Features

- **Status bar**: always shows the remaining percentage of your lowest model; hover for the full list
- **Detail dashboard**: click the status bar for every model's progress bar, remaining percentage, and time until reset
- **Auto refresh**: configurable polling interval (60 seconds by default)
- **Color coding**: warning color at 30% or below, danger color at 10% or below (thresholds are configurable)
- **Threshold notifications**: alerts you when a model drops below a threshold
- **Reset notifications**: alerts you when the quota reset time arrives

```
Models
──────────
Claude Opus 4.6
■■■■□□□□□□ 45%  ↻ 3h21m

Gemini 3.1 Pro
■■■■■■■□□□ 71%  ↻ 2h05m
```

## How it works

It connects directly to the Language Server that Antigravity IDE runs internally — no extra sign-in, everything stays local:

1. Find `language_server` in the process list and extract `--csrf_token`
   (macOS/Linux: `ps`, Windows: PowerShell `Get-CimInstance`)
2. Enumerate that process's listening ports
   (macOS/Linux: `lsof`, Windows: `netstat`)
3. POST the Connect RPC `/exa.language_server_pb.LanguageServerService/GetUserStatus`
   to each port with an `X-Codeium-Csrf-Token` header

Because these internals are unstable, the extension displays the `remainingFraction` / `resetTime` the server returns as-is and does not try to interpret quota semantics (5-hour rolling windows, weekly caps, and so on).

Variants sharing one quota pool (for example `Gemini 3.5 Flash (Low/Medium/High)`) are collapsed into a single group.

## Installation

### From VSIX

Install [Antigravity IDE](https://antigravity.google/) first (see the prerequisite above). Then download the `.vsix` from [Releases](https://github.com/hiroomi0910/Model-usage-display/releases) and, in your editor (VS Code / Antigravity IDE / any VS Code-based IDE), go to the Extensions view → `…` menu → **Install from VSIX** → pick the downloaded `.vsix`.

Or from the CLI (replace `code` with your editor's CLI name):

```sh
code --install-extension model-usage-display-x.y.z.vsix
```

Full paths on macOS, if the CLI is not on your PATH:

```sh
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension model-usage-display-x.y.z.vsix
"/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" --install-extension model-usage-display-x.y.z.vsix
```

### From source

```sh
npm install
npm run compile
npm run package   # produces model-usage-display-x.y.z.vsix
```

## Settings

| Key | Default | Description |
|---|---|---|
| `modelUsageDisplay.pollIntervalSeconds` | `60` | Auto-refresh interval in seconds (minimum 10) |
| `modelUsageDisplay.warnThresholdPercent` | `30` | Remaining % at which the warning color kicks in |
| `modelUsageDisplay.dangerThresholdPercent` | `10` | Remaining % at which the danger color kicks in |
| `modelUsageDisplay.notifyOnThreshold` | `true` | Turn threshold notifications on or off |
| `modelUsageDisplay.notifyOnReset` | `true` | Turn reset-time notifications on or off |
| `modelUsageDisplay.hiddenModels` | `[]` | Model names to hide |

## Commands

- `Model Usage: Show Details` — open the dashboard (same as clicking the status bar)
- `Model Usage: Refresh Now` — refresh manually

## Supported environments

- **Editors**: VS Code 1.74 or later, plus VS Code-based IDEs such as Antigravity IDE. Quota comes from the Antigravity Language Server process running on the machine rather than from the editor itself, so **Antigravity IDE must be running** regardless of which editor you use
- **OS**: macOS and Windows (both verified). Linux is implemented but untested
- **Display language**: English (default) and Japanese, following your editor's display language

## Limitations and disclaimer

- Antigravity IDE has to be running, because the extension connects to the Language Server inside it — this applies equally when the extension is installed in another editor
- It **depends on Antigravity's private, undocumented internals**, so an IDE update can break it without warning. This is an unofficial personal project, not affiliated with Google, and comes with no warranty (MIT license)
- All traffic goes to `127.0.0.1` (the local Language Server) only. Nothing is sent to external servers, and there is no telemetry

## Privacy

The only data this extension handles is the quota information the Language Server returns: model names, remaining amounts, and reset times. It is held in memory only — never written to disk, never transmitted.

## Prior art

- [antigravity-usage](https://github.com/skainguyen1412/antigravity-usage) — the connection approach (CSRF token discovery, Connect RPC)
- [AntigravityQuotaWatcher](https://github.com/wusimpl/AntigravityQuotaWatcher)
- [antigravity-usage-monitor](https://github.com/tuckiestudio/antigravity-usage-monitor)

## License

[MIT](https://github.com/hiroomi0910/Model-usage-display/blob/main/LICENSE)

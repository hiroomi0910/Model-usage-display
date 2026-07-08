/**
 * Antigravity Language Server への接続とクォータ取得。
 *
 * 仕組み（antigravity-usage / AntigravityQuotaWatcher の実装を参考）:
 *  1. プロセス一覧から language_server を探し --csrf_token を抜き出す
 *     （macOS/Linux: ps、Windows: PowerShell の Get-CimInstance）
 *  2. そのプロセスの LISTEN ポートを列挙
 *     （macOS/Linux: lsof、Linux フォールバック: ss、Windows: netstat）
 *  3. 各ポートに X-Codeium-Csrf-Token 付きで
 *     /exa.language_server_pb.LanguageServerService/GetUserStatus を POST
 *     （http → https の順に試行。https は自己署名証明書）
 *
 * このモジュールは vscode に依存しない（node 単体で動作テストできる）。
 */
import { exec } from "child_process";
import * as http from "http";
import * as https from "https";
import { ModelQuota, QuotaFetchError, QuotaSnapshot } from "./types";

const RPC_PATH = "/exa.language_server_pb.LanguageServerService/GetUserStatus";
const RPC_BODY = JSON.stringify({
  metadata: { ideName: "antigravity", extensionName: "antigravity", locale: "en" },
});

interface Endpoint {
  port: number;
  protocol: "http" | "https";
  csrfToken: string;
}

function run(cmd: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

interface ServerProcess {
  pid: number;
  csrfToken: string;
}

const isWindows = process.platform === "win32";

/** 「PID コマンドライン」を1行ずつ返す（psの pid=,command= と同じ形） */
async function listProcessCommandLines(): Promise<string> {
  if (isWindows) {
    // wmic は新しいWindowsで廃止済みのため PowerShell + CIM を使う。
    // cmd.exe の環境変数展開を避けるため % を含む WQL LIKE は使わない
    return run(
      'powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like \'*csrf_token*\' } | ForEach-Object { \'{0} {1}\' -f $_.ProcessId, $_.CommandLine }"',
      15000 // PowerShellの起動が遅い環境を考慮
    );
  }
  return run("ps -axo pid=,command=");
}

async function findServerProcesses(): Promise<ServerProcess[]> {
  const out = await listProcessCommandLines();
  const results: ServerProcess[] = [];
  for (const line of out.split("\n")) {
    if (!line.includes("language_server") || !line.includes("--csrf_token")) {
      continue;
    }
    const pidMatch = line.match(/^\s*(\d+)\s/);
    const tokenMatch = line.match(/--csrf_token[= ]([\w-]+)/);
    if (pidMatch && tokenMatch) {
      results.push({ pid: Number(pidMatch[1]), csrfToken: tokenMatch[1] });
    }
  }
  return results;
}

async function listenPorts(pid: number): Promise<number[]> {
  if (isWindows) {
    return listenPortsWindows(pid);
  }
  const ports = new Set<number>();
  const out = await run(`lsof -nP -iTCP -sTCP:LISTEN -a -p ${pid}`).catch(() => "");
  for (const line of out.split("\n")) {
    const m = line.match(/:(\d+)\s+\(LISTEN\)/);
    if (m) {
      ports.add(Number(m[1]));
    }
  }
  if (ports.size === 0 && process.platform === "linux") {
    // lsof が入っていないLinux向けフォールバック
    const out2 = await run("ss -ltnp").catch(() => "");
    for (const line of out2.split("\n")) {
      if (!line.includes(`pid=${pid},`)) {
        continue;
      }
      const m = line.match(/\s\S+:(\d+)\s/);
      if (m) {
        ports.add(Number(m[1]));
      }
    }
  }
  return [...ports];
}

async function listenPortsWindows(pid: number): Promise<number[]> {
  const out = await run("netstat -ano -p TCP", 10000).catch(() => "");
  const ports = new Set<number>();
  for (const line of out.split("\n")) {
    // 例: "  TCP    127.0.0.1:42100    0.0.0.0:0    LISTENING    1234"
    const m = line.match(/^\s*TCP\s+\S+:(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s*$/);
    if (!m || Number(m[4]) !== pid) {
      continue;
    }
    // 状態名がローカライズされる環境に備え、待ち受けの特徴（相手先 :0）でも判定する
    if (m[3].toUpperCase().includes("LISTEN") || m[2].endsWith(":0")) {
      ports.add(Number(m[1]));
    }
  }
  return [...ports];
}

function rpcRequest(endpoint: Endpoint, timeoutMs = 5000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const mod = endpoint.protocol === "https" ? https : http;
    const req = mod.request(
      {
        hostname: "127.0.0.1",
        port: endpoint.port,
        path: RPC_PATH,
        method: "POST",
        timeout: timeoutMs,
        rejectUnauthorized: false, // 自己署名証明書を許可
        headers: {
          "Content-Type": "application/json",
          "Connect-Protocol-Version": "1",
          "X-Codeium-Csrf-Token": endpoint.csrfToken,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`invalid JSON from port ${endpoint.port}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode} from port ${endpoint.port}: ${data.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`timeout on port ${endpoint.port}`));
    });
    req.write(RPC_BODY);
    req.end();
  });
}

/** "Claude Opus 4.6 (Thinking)" → "Claude Opus 4.6" のようにバリアント表記を除去 */
function groupLabel(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

interface RawModelConfig {
  label?: string;
  quotaInfo?: {
    remainingFraction?: number;
    resetTime?: string;
  };
}

function parseUserStatus(response: unknown): ModelQuota[] {
  const configs: RawModelConfig[] =
    (response as any)?.userStatus?.cascadeModelConfigData?.clientModelConfigs ?? [];
  const groups = new Map<string, ModelQuota>();
  for (const cfg of configs) {
    if (!cfg.label || !cfg.quotaInfo) {
      continue; // クォータ管理対象外のモデルはスキップ
    }
    // proto3 の JSON では 0 のフィールドが省略されるため、欠落は 0 として扱う
    const fraction = cfg.quotaInfo.remainingFraction ?? 0;
    const resetTime = cfg.quotaInfo.resetTime ? new Date(cfg.quotaInfo.resetTime) : undefined;
    const key = groupLabel(cfg.label);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        label: key,
        rawLabels: [cfg.label],
        remainingFraction: fraction,
        resetTime,
      });
    } else {
      existing.rawLabels.push(cfg.label);
      if (fraction < existing.remainingFraction) {
        existing.remainingFraction = fraction;
        existing.resetTime = resetTime;
      }
    }
  }
  return [...groups.values()];
}

export class LanguageServerClient {
  private cachedEndpoint: Endpoint | undefined;

  /** キャッシュ済みエンドポイントを試し、失敗したら再検出して取得する */
  async fetchQuota(): Promise<QuotaSnapshot> {
    if (this.cachedEndpoint) {
      try {
        const response = await rpcRequest(this.cachedEndpoint);
        return { models: parseUserStatus(response), fetchedAt: new Date() };
      } catch {
        this.cachedEndpoint = undefined; // IDE再起動などでポートが変わった
      }
    }
    const response = await this.detectAndFetch();
    return { models: parseUserStatus(response), fetchedAt: new Date() };
  }

  private async detectAndFetch(): Promise<unknown> {
    const processes = await findServerProcesses();
    if (processes.length === 0) {
      throw new QuotaFetchError(
        "Antigravity Language Server が見つかりません",
        "Antigravity IDE が起動しているか確認してください"
      );
    }
    const errors: string[] = [];
    for (const proc of processes) {
      const ports = await listenPorts(proc.pid);
      for (const port of ports) {
        for (const protocol of ["http", "https"] as const) {
          const endpoint: Endpoint = { port, protocol, csrfToken: proc.csrfToken };
          try {
            const response = await rpcRequest(endpoint, 2000);
            this.cachedEndpoint = endpoint;
            return response;
          } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e));
          }
        }
      }
    }
    throw new QuotaFetchError(
      "Language Server に接続できませんでした",
      `試行結果: ${errors.slice(0, 3).join(" / ") || "LISTENポートなし"}`
    );
  }
}

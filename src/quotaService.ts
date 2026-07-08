/**
 * ポーリング・キャッシュ・イベント配信を担うサービス層。
 * StatusBar / ダッシュボード / 通知はこのサービスの update イベントを購読する。
 */
import * as vscode from "vscode";
import { LanguageServerClient } from "./languageServerClient";
import { QuotaSnapshot } from "./types";

export interface QuotaUpdate {
  snapshot: QuotaSnapshot | undefined; // 直近の成功結果（エラー時も前回値を保持）
  error: Error | undefined; // 直近の取得エラー
}

export class QuotaService implements vscode.Disposable {
  private readonly client = new LanguageServerClient();
  private readonly emitter = new vscode.EventEmitter<QuotaUpdate>();
  readonly onUpdate = this.emitter.event;

  private timer: NodeJS.Timeout | undefined;
  private configListener: vscode.Disposable | undefined;
  private lastSnapshot: QuotaSnapshot | undefined;
  private lastError: Error | undefined;
  private fetching = false;

  get current(): QuotaUpdate {
    return { snapshot: this.lastSnapshot, error: this.lastError };
  }

  start(): void {
    this.schedule();
    void this.refresh();
    this.configListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("modelUsageDisplay.pollIntervalSeconds")) {
        this.schedule();
      }
    });
  }

  private schedule(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    const seconds = Math.max(
      10,
      vscode.workspace.getConfiguration("modelUsageDisplay").get<number>("pollIntervalSeconds", 60)
    );
    this.timer = setInterval(() => void this.refresh(), seconds * 1000);
  }

  async refresh(): Promise<void> {
    if (this.fetching) {
      return;
    }
    this.fetching = true;
    try {
      this.lastSnapshot = await this.client.fetchQuota();
      this.lastError = undefined;
    } catch (e) {
      this.lastError = e instanceof Error ? e : new Error(String(e));
    } finally {
      this.fetching = false;
      this.emitter.fire(this.current);
    }
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.configListener?.dispose();
    this.emitter.dispose();
  }
}

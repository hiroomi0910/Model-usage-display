/**
 * しきい値通知とクォータリセット通知。
 * - しきい値: 残量が warn/danger しきい値を「またいで下回った」ときに1回だけ通知
 * - リセット: 残量が減っているモデルの最も早い resetTime にタイマーを張り、
 *   時刻になったら通知して再取得を促す
 */
import * as vscode from "vscode";
import { localTime, percent } from "./format";
import { QuotaService, QuotaUpdate } from "./quotaService";
import { visibleModels } from "./statusBar";
import { ModelQuota } from "./types";

export class QuotaNotifier implements vscode.Disposable {
  private prevModels = new Map<string, ModelQuota>();
  private resetTimer: NodeJS.Timeout | undefined;
  private notifiedResetAt: number | undefined;

  constructor(private readonly service: QuotaService) {}

  handleUpdate(update: QuotaUpdate): void {
    if (!update.snapshot || update.error) {
      return;
    }
    const config = vscode.workspace.getConfiguration("modelUsageDisplay");
    const models = visibleModels(update.snapshot.models);

    if (config.get<boolean>("notifyOnThreshold", true)) {
      this.checkThresholds(models, config);
    }
    if (config.get<boolean>("notifyOnReset", true)) {
      this.scheduleResetNotification(models);
    } else if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    this.prevModels = new Map(models.map((m) => [m.label, m]));
  }

  private checkThresholds(models: ModelQuota[], config: vscode.WorkspaceConfiguration): void {
    const warn = config.get<number>("warnThresholdPercent", 30);
    const danger = config.get<number>("dangerThresholdPercent", 10);
    for (const m of models) {
      const prev = this.prevModels.get(m.label);
      if (!prev) {
        continue; // 初回は通知しない（起動のたびに鳴るのを防ぐ）
      }
      const prevPct = percent(prev.remainingFraction);
      const pct = percent(m.remainingFraction);
      if (prevPct > danger && pct <= danger) {
        void vscode.window.showWarningMessage(
          vscode.l10n.t("⛔ {0} is at {1}% remaining", m.label, pct)
        );
      } else if (prevPct > warn && pct <= warn) {
        void vscode.window.showWarningMessage(
          vscode.l10n.t("⚠ {0} is at {1}% remaining", m.label, pct)
        );
      }
    }
  }

  private scheduleResetNotification(models: ModelQuota[]): void {
    // 残量が減っているモデルのうち最も早いリセット時刻を狙う
    const now = Date.now();
    const candidates = models
      .filter((m) => m.remainingFraction < 0.995 && m.resetTime && m.resetTime.getTime() > now)
      .map((m) => m.resetTime!.getTime());
    if (candidates.length === 0) {
      return;
    }
    const target = Math.min(...candidates);
    if (this.notifiedResetAt === target) {
      return; // この時刻は通知済み
    }
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    // setTimeout の上限(約24.8日)を超えないようにクランプ。ポーリングで再スケジュールされる
    const delay = Math.min(target - now, 2 ** 31 - 1);
    this.resetTimer = setTimeout(() => {
      this.notifiedResetAt = target;
      // 通知の選択肢は表示と判定で同じ文字列を使う
      const refreshAction = vscode.l10n.t("Refresh now");
      void vscode.window
        .showInformationMessage(
          vscode.l10n.t("🔄 Model quota reset time ({0}) has arrived", localTime(new Date(target))),
          refreshAction
        )
        .then((choice) => {
          if (choice === refreshAction) {
            void this.service.refresh();
          }
        });
    }, delay);
  }

  dispose(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  }
}

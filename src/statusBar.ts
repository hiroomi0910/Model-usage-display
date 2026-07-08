import * as vscode from "vscode";
import { bar, localTime, lowestModel, percent, untilReset } from "./format";
import { QuotaUpdate } from "./quotaService";
import { ModelQuota } from "./types";

export function visibleModels(models: ModelQuota[]): ModelQuota[] {
  const hidden = vscode.workspace
    .getConfiguration("modelUsageDisplay")
    .get<string[]>("hiddenModels", []);
  return models.filter((m) => !hidden.includes(m.label));
}

export class QuotaStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = "modelUsageDisplay.showDetails";
    this.item.text = "$(sync~spin) Models";
    this.item.show();
  }

  update(update: QuotaUpdate): void {
    const config = vscode.workspace.getConfiguration("modelUsageDisplay");
    const warnPct = config.get<number>("warnThresholdPercent", 30);
    const dangerPct = config.get<number>("dangerThresholdPercent", 10);

    if (!update.snapshot) {
      this.item.text = "$(warning) Models: 接続不可";
      this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
      this.item.tooltip = update.error
        ? `${update.error.message}\n${(update.error as any).hint ?? ""}`
        : "クォータ情報を取得できません";
      return;
    }

    const models = visibleModels(update.snapshot.models);
    const lowest = lowestModel(models);
    if (!lowest) {
      this.item.text = "$(zap) Models: -";
      this.item.backgroundColor = undefined;
      this.item.tooltip = "表示対象のモデルがありません";
      return;
    }

    const pct = percent(lowest.remainingFraction);
    this.item.text = `$(zap) ${lowest.label} ${pct}%`;
    if (pct <= dangerPct) {
      this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    } else if (pct <= warnPct) {
      this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    } else {
      this.item.backgroundColor = undefined;
    }

    const md = new vscode.MarkdownString();
    md.appendMarkdown("**Models**\n\n");
    for (const m of models) {
      md.appendMarkdown(
        `${m.label}  \n\`${bar(m.remainingFraction)}\` ${percent(m.remainingFraction)}%` +
          (m.resetTime ? `  ↻ ${untilReset(m.resetTime)} (${localTime(m.resetTime)})` : "") +
          "\n\n"
      );
    }
    if (update.error) {
      md.appendMarkdown(`⚠ 最終更新に失敗（前回値を表示中）: ${update.error.message}\n\n`);
    }
    md.appendMarkdown(`_更新: ${localTime(update.snapshot.fetchedAt)}_`);
    this.item.tooltip = md;
  }

  dispose(): void {
    this.item.dispose();
  }
}

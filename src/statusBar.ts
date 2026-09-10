import * as vscode from "vscode";
import { describeError } from "./errorText";
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
    const resetLabel = vscode.l10n.t("Reset");

    if (!update.snapshot) {
      this.item.text = `$(warning) ${vscode.l10n.t("Models: Unavailable")}`;
      this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
      if (update.error) {
        const { message, hint } = describeError(update.error);
        this.item.tooltip = hint ? `${message}\n${hint}` : message;
      } else {
        this.item.tooltip = vscode.l10n.t("Quota information is unavailable");
      }
      return;
    }

    const models = visibleModels(update.snapshot.models);
    const lowest = lowestModel(models);
    if (!lowest) {
      this.item.text = "$(zap) Models: -";
      this.item.backgroundColor = undefined;
      this.item.tooltip = vscode.l10n.t("No models to display");
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
          (m.resetTime
            ? `  ↻ ${untilReset(m.resetTime, { resetLabel })} (${localTime(m.resetTime)})`
            : "") +
          "\n\n"
      );
    }
    if (update.error) {
      md.appendMarkdown(
        vscode.l10n.t(
          "⚠ Last refresh failed (showing previous values): {0}",
          describeError(update.error).message
        ) + "\n\n"
      );
    }
    md.appendMarkdown(`_${vscode.l10n.t("Updated: {0}", localTime(update.snapshot.fetchedAt))}_`);
    this.item.tooltip = md;
  }

  dispose(): void {
    this.item.dispose();
  }
}

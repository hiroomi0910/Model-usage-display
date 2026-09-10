import * as vscode from "vscode";
import { describeError } from "./errorText";
import { bar, localTime, percent, untilReset } from "./format";
import { QuotaService } from "./quotaService";
import { visibleModels } from "./statusBar";

/** ステータスバークリックで開く詳細ダッシュボード（QuickPick） */
export async function showDashboard(service: QuotaService): Promise<void> {
  const { snapshot, error } = service.current;
  // 表示と選択判定で同じ文字列を使う必要があるため、ローカライズ結果を束ねておく
  const refreshLabel = `$(refresh) ${vscode.l10n.t("Refresh now")}`;
  const resetLabel = vscode.l10n.t("Reset");

  const items: vscode.QuickPickItem[] = [];
  if (snapshot) {
    for (const m of visibleModels(snapshot.models)) {
      items.push({
        label: m.label,
        description: `${bar(m.remainingFraction)} ${percent(m.remainingFraction)}%`,
        detail: m.resetTime
          ? `$(clock) ${vscode.l10n.t(
              "Resets in {0} ({1})",
              untilReset(m.resetTime, { resetLabel }),
              localTime(m.resetTime)
            )}`
          : undefined,
      });
    }
    items.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
  }
  if (error) {
    const { message, hint } = describeError(error);
    items.push({
      label: `$(warning) ${vscode.l10n.t("Fetch error")}`,
      detail: hint ? `${message} — ${hint}` : message,
    });
  }
  items.push({ label: refreshLabel });

  const placeHolder = snapshot
    ? vscode.l10n.t("Models — updated {0}", localTime(snapshot.fetchedAt))
    : vscode.l10n.t("Quota information is unavailable");
  const picked = await vscode.window.showQuickPick(items, { placeHolder });

  if (picked?.label === refreshLabel) {
    await service.refresh();
    await showDashboard(service);
  }
}

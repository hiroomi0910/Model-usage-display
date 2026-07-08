import * as vscode from "vscode";
import { bar, localTime, percent, untilReset } from "./format";
import { QuotaService } from "./quotaService";
import { visibleModels } from "./statusBar";

const REFRESH_LABEL = "$(refresh) 今すぐ更新";

/** ステータスバークリックで開く詳細ダッシュボード（QuickPick） */
export async function showDashboard(service: QuotaService): Promise<void> {
  const { snapshot, error } = service.current;

  const items: vscode.QuickPickItem[] = [];
  if (snapshot) {
    for (const m of visibleModels(snapshot.models)) {
      items.push({
        label: m.label,
        description: `${bar(m.remainingFraction)} ${percent(m.remainingFraction)}%`,
        detail: m.resetTime
          ? `$(clock) リセットまで ${untilReset(m.resetTime)}（${localTime(m.resetTime)}）`
          : undefined,
      });
    }
    items.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
  }
  if (error) {
    items.push({
      label: "$(warning) 取得エラー",
      detail: `${error.message}${(error as any).hint ? ` — ${(error as any).hint}` : ""}`,
    });
  }
  items.push({ label: REFRESH_LABEL });

  const placeHolder = snapshot
    ? `Models — 最終更新 ${localTime(snapshot.fetchedAt)}`
    : "クォータ情報を取得できていません";
  const picked = await vscode.window.showQuickPick(items, { placeHolder });

  if (picked?.label === REFRESH_LABEL) {
    await service.refresh();
    await showDashboard(service);
  }
}

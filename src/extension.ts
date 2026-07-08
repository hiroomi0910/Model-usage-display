import * as vscode from "vscode";
import { showDashboard } from "./dashboard";
import { QuotaNotifier } from "./notifier";
import { QuotaService } from "./quotaService";
import { QuotaStatusBar } from "./statusBar";

export function activate(context: vscode.ExtensionContext): void {
  const service = new QuotaService();
  const statusBar = new QuotaStatusBar();
  const notifier = new QuotaNotifier(service);

  context.subscriptions.push(
    service,
    statusBar,
    notifier,
    service.onUpdate((update) => {
      statusBar.update(update);
      notifier.handleUpdate(update);
    }),
    vscode.commands.registerCommand("modelUsageDisplay.showDetails", () => showDashboard(service)),
    vscode.commands.registerCommand("modelUsageDisplay.refresh", () => service.refresh()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("modelUsageDisplay")) {
        statusBar.update(service.current);
      }
    })
  );

  service.start();
}

export function deactivate(): void {}

import * as vscode from "vscode";
import { QuotaFetchError } from "./types";

/**
 * 取得エラーを表示用のローカライズ済み文言にする。
 * languageServerClient を vscode 非依存に保つため、文言の解決はここに集約している。
 */
export function describeError(error: Error): { message: string; hint?: string } {
  if (!(error instanceof QuotaFetchError)) {
    return { message: error.message };
  }
  switch (error.code) {
    case "serverNotFound":
      return {
        message: vscode.l10n.t("Antigravity Language Server not found"),
        hint: vscode.l10n.t(
          "This extension requires Antigravity IDE. Install it on this machine and keep it running."
        ),
      };
    case "connectionFailed":
      return {
        message: vscode.l10n.t("Could not connect to the Language Server"),
        hint: error.detail ? vscode.l10n.t("Attempts: {0}", error.detail) : undefined,
      };
  }
}

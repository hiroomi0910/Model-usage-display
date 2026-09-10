/** グループ化後の1モデル分のクォータ情報 */
export interface ModelQuota {
  /** 表示名（"(Low)" などのバリアント表記を除いたグループ名） */
  label: string;
  /** グループに含まれる元のモデルラベル */
  rawLabels: string[];
  /** 残量 0.0〜1.0 */
  remainingFraction: number;
  /** クォータがリセットされる時刻（サーバーが返さない場合は undefined） */
  resetTime: Date | undefined;
}

export interface QuotaSnapshot {
  models: ModelQuota[];
  fetchedAt: Date;
}

/** 表示側でローカライズするための識別子 */
export type QuotaFetchErrorCode = "serverNotFound" | "connectionFailed";

export class QuotaFetchError extends Error {
  /**
   * @param code   表示側がローカライズ済み文言を選ぶための識別子
   * @param message 英語のフォールバック文言（vscode 非依存で実行したときはこれが出る）
   * @param detail  ローカライズしない診断情報（接続試行のエラー内容など）
   */
  constructor(
    public readonly code: QuotaFetchErrorCode,
    message: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = "QuotaFetchError";
  }
}

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

export class QuotaFetchError extends Error {
  constructor(message: string, public readonly hint?: string) {
    super(message);
    this.name = "QuotaFetchError";
  }
}

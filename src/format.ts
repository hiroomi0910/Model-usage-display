import { ModelQuota } from "./types";

export function percent(fraction: number): number {
  return Math.round(fraction * 100);
}

/** ■■■■□□□□□□ 形式のプログレスバー（filled=残量） */
export function bar(fraction: number, width = 10): string {
  const filled = Math.max(0, Math.min(width, Math.round(fraction * width)));
  return "■".repeat(filled) + "□".repeat(width - filled);
}

/** リセットまでの残り時間を "3h21m" 形式で返す。過去なら "リセット済" */
export function untilReset(resetTime: Date | undefined, now = new Date()): string {
  if (!resetTime) {
    return "-";
  }
  const ms = resetTime.getTime() - now.getTime();
  if (ms <= 0) {
    return "リセット済";
  }
  const totalMinutes = Math.ceil(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}m` : `${m}m`;
}

export function localTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** 残量が最も少ないモデルを返す */
export function lowestModel(models: ModelQuota[]): ModelQuota | undefined {
  if (models.length === 0) {
    return undefined;
  }
  return models.reduce((min, m) => (m.remainingFraction < min.remainingFraction ? m : min));
}

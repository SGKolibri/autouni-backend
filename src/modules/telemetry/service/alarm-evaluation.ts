import { AlarmLevel, SensorThreshold } from '@prisma/client';

export type ThresholdLimits = Pick<
  SensorThreshold,
  'warnAt' | 'alarmAt' | 'clearAt'
>;

export function levelFor(value: number, t: ThresholdLimits): AlarmLevel | null {
  if (value >= t.alarmAt) return AlarmLevel.CRITICAL;
  if (t.warnAt !== null && value >= t.warnAt) return AlarmLevel.WARNING;
  return null;
}

// Abaixo disto um alarme aberto se encerra. Entre este valor e o limite de
// disparo o alarme continua aberto: evita abrir/fechar a cada oscilação.
export function clearBelow(t: ThresholdLimits): number {
  return t.clearAt ?? t.warnAt ?? t.alarmAt;
}

export type AlarmTransition =
  | { action: 'none' }
  | { action: 'open'; level: AlarmLevel; threshold: number }
  | { action: 'escalate'; level: AlarmLevel; threshold: number }
  | { action: 'update' }
  | { action: 'clear' };

export function alarmTransition(
  value: number,
  t: ThresholdLimits,
  open: { level: AlarmLevel } | null,
): AlarmTransition {
  const level = levelFor(value, t);
  const thresholdFor = (l: AlarmLevel) =>
    l === AlarmLevel.CRITICAL ? t.alarmAt : (t.warnAt as number);

  if (!open) {
    return level
      ? { action: 'open', level, threshold: thresholdFor(level) }
      : { action: 'none' };
  }
  if (level === AlarmLevel.CRITICAL && open.level === AlarmLevel.WARNING) {
    return { action: 'escalate', level, threshold: t.alarmAt };
  }
  if (!level && value < clearBelow(t)) return { action: 'clear' };
  return { action: 'update' };
}

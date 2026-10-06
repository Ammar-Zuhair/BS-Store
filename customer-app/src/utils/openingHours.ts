export interface DailyHours {
  openingTime?: string | null;
  closingTime?: string | null;
  is24Hours?: boolean;
}

export interface OrderHours extends DailyHours {
  isEnabled: boolean;
  timeZone: string;
  serverTime: string;
  isAcceptingOrders: boolean;
}

function minutes(value?: string | null): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

export function isOpenNow(hours: DailyHours, now: number): boolean | null {
  if (hours.is24Hours) return true;
  const opening = minutes(hours.openingTime);
  const closing = minutes(hours.closingTime);
  if (opening === null || closing === null || opening === closing) return null;
  // Yemen uses UTC+3. Use UTC fields so the phone's time zone has no effect.
  const local = new Date(now + 3 * 60 * 60 * 1000);
  const current = local.getUTCHours() * 60 + local.getUTCMinutes();
  return opening < closing
    ? current >= opening && current < closing
    : current >= opening || current < closing;
}

export function formatTime(value?: string | null): string {
  const parsed = minutes(value);
  if (parsed === null) return 'غير محدد';
  const hour = Math.floor(parsed / 60);
  return `${hour % 12 || 12}:${String(parsed % 60).padStart(2, '0')} ${hour < 12 ? 'ص' : 'م'}`;
}

export function hoursDescription(hours: DailyHours): string {
  if (hours.is24Hours) return 'مفتوح 24 ساعة';
  if (minutes(hours.openingTime) === null || minutes(hours.closingTime) === null) return 'لم تُحدد مواعيد المتجر بعد';
  const overnight = minutes(hours.openingTime)! > minutes(hours.closingTime)!;
  return `يفتح ${formatTime(hours.openingTime)} • يقفل ${formatTime(hours.closingTime)}${overnight ? ' (اليوم التالي)' : ''}`;
}

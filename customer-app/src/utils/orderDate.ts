/** Display the date and time of an order in Yemen's local time. */
export function formatOrderDate(value?: string | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('ar-YE', {
    day: '2-digit', month: '2-digit', year: 'numeric', calendar: 'gregory', timeZone: 'Asia/Aden',
  });
  const time = date.toLocaleTimeString('ar-YE', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Aden',
  });
  return `${day} · ${time}`;
}

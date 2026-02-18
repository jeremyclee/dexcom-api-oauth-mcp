/**
 * Format a date object to YYYY-MM-DDTHH:mm:ss string
 * This format is required by the Dexcom API which does not accept milliseconds or timezone/Z suffix
 */
export function formatDateForDexcom(date: Date): string {
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

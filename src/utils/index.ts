const pad = (value: number) => value.toString().padStart(2, '0');

export function formatSeconds(totalSeconds: number): string {
  const totalTenths = Math.round(totalSeconds * 10);
  const tenths = totalTenths % 10;
  const wholeSeconds = Math.floor(totalTenths / 10);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = `${pad(wholeSeconds % 60)}.${tenths}`;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${seconds}`;
  } else if (minutes > 0) {
    return `${minutes}:${seconds}`;
  }

  return seconds;
}

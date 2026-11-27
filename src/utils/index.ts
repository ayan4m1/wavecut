import { ExportSize } from '../types';

const pad = (value: number) => value.toString().padStart(2, '0');

export const VIDEO_SIZES = {
  [ExportSize.Square]: [1080, 1080],
  [ExportSize.Horizontal]: [1920, 1080],
  [ExportSize.Vertical]: [1080, 1920]
} as const;
const VIDEO_FORMATS = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // H.264 + AAC: what social platforms want
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm'
];

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

export function pickMimeType(): string | undefined {
  return VIDEO_FORMATS.find((t) => MediaRecorder.isTypeSupported(t));
}

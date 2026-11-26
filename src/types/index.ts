export type Episode = {
  content: Blob;
  title: string;
  artworkUrl: string;
};

export type AudioSelection = {
  start: number;
  end: number;
};

export type ExportStyle = {
  colors: {
    fg: string;
    bg: string;
    text: string;
  };
  text: {
    outline: boolean;
  };
};

export type ExportState = {
  status: 'init' | 'process' | 'done';
  progress: number;
};

export enum ExportSize {
  Square = 'square',
  Vertical = 'vertical',
  Horizontal = 'horizontal'
}

export interface ClipPlayerOptions {
  /** Fade-in length in seconds (default 0.4) */
  fadeIn?: number;
  /** Fade-out length in seconds (default 0.4) */
  fadeOut?: number;
  /** How long to wait after the selection stops changing before re-slicing (ms, default 150) */
  sliceDebounceMs?: number;
}

export interface ClipPlayer {
  /** Plays the clip with fades. Resolves when playback ends or is stopped. */
  playClip: () => Promise<void>;
  /** Stops playback with a short ramp to avoid a click. */
  stopClip: () => void;
  /** Seconds since the current playback started (0 when stopped). Call from requestAnimationFrame. */
  getElapsed: () => number;
  /** Shared AnalyserNode. Read levels from it, or connect it to a MediaStreamAudioDestinationNode for export. */
  getAnalyser: () => AnalyserNode;
  /** The trimmed clip, or null while decoding/slicing. */
  clipBuffer: AudioBuffer | null;
  /** Full episode duration in seconds (0 until decoded). */
  duration: number;
  isDecoding: boolean;
  isPlaying: boolean;
  error: Error | null;
}

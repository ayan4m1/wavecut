import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { AudioSelection, ClipPlayerOptions } from '../types';
import { pickMimeType } from '../utils';

interface AudioGraph {
  ctx: AudioContext;
  analyser: AnalyserNode;
  recordDest: MediaStreamAudioDestinationNode;
}

const RECORD_FPS = 30;
// Slightly under 1000 / 30 so rAF jitter on a 60 Hz display doesn't skip every other eligible tick.
const FRAME_INTERVAL_MS = 1000 / RECORD_FPS - 2;

// Firefox's CanvasCaptureMediaStream has requestFrame() on the stream itself (not in lib.dom).
type CanvasCaptureStream = MediaStream & { requestFrame?: () => void };
type CaptureTrack = MediaStreamTrack & { requestFrame?: () => void };

type DecodeResult =
  | { blob: Blob; buffer: AudioBuffer; error: null }
  | { blob: Blob; buffer: null; error: Error };

export default function useWebAudio(
  blob: Blob | undefined,
  selection: AudioSelection | undefined,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  { fadeIn = 0.4, fadeOut = 0.4 }: ClipPlayerOptions = {}
) {
  const graphRef = useRef<AudioGraph | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const captureFrameRef = useRef<(() => void) | null>(null);
  const lastFrameAtRef = useRef(0);
  const startedAtRef = useRef(0);
  const resolveRef = useRef<(() => void) | null>(null);

  // Only two pieces of real state: the latest decode result and whether we're playing.
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Lazily create the AudioContext + analyser. Recreated if a previous one was closed
  // (e.g. React StrictMode runs mount/unmount twice in development).
  const getGraph = useCallback((): AudioGraph => {
    if (!graphRef.current || graphRef.current.ctx.state === 'closed') {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();

      analyser.fftSize = 2048; // 1024 bins (~23 Hz each at 48 kHz): enough low-end resolution for log-spaced bars
      analyser.smoothingTimeConstant = 0.8;
      // Long-lived recording tap; each playback's gain node connects to it.
      const recordDest = ctx.createMediaStreamDestination();
      graphRef.current = { ctx, analyser, recordDest };
    }
    return graphRef.current;
  }, []);

  const getAnalyser = useCallback(() => getGraph().analyser, [getGraph]);

  const getRecorder = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') {
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Visualizer canvas not mounted');
      }

      // Must share the graph's AudioContext; nodes can't connect across contexts.
      const { recordDest } = getGraph();
      const stream = new MediaStream();
      const mimeType = pickMimeType();
      // Frame rate 0 = manual capture; the draw loop calls requestFrame() so each frame is a fresh draw.
      let videoStream = canvas.captureStream(0) as CanvasCaptureStream;
      let videoTrack: CaptureTrack = videoStream.getVideoTracks()[0];

      // Chrome/Safari expose requestFrame() on the track, Firefox on the stream.
      if (typeof videoTrack.requestFrame === 'function') {
        const track = videoTrack;
        captureFrameRef.current = () => track.requestFrame?.();
      } else if (typeof videoStream.requestFrame === 'function') {
        const capture = videoStream;
        captureFrameRef.current = () => capture.requestFrame?.();
      } else {
        // No manual capture support: fall back to timed capture.
        videoTrack.stop();
        videoStream = canvas.captureStream(RECORD_FPS);
        videoTrack = videoStream.getVideoTracks()[0];
        captureFrameRef.current = null;
      }
      lastFrameAtRef.current = 0;
      stream.addTrack(recordDest.stream.getAudioTracks()[0]);
      stream.addTrack(videoTrack);
      recorderRef.current = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
    }
    return recorderRef.current;
  }, [canvasRef, getGraph]);

  // Called after each canvas draw; captures at most RECORD_FPS frames per second.
  const requestFrame = useCallback(() => {
    const captureFrame = captureFrameRef.current;
    if (!captureFrame || recorderRef.current?.state !== 'recording') {
      return;
    }

    const now = performance.now();
    if (now - lastFrameAtRef.current < FRAME_INTERVAL_MS) {
      return;
    }

    lastFrameAtRef.current = now;
    captureFrame();
  }, []);

  // Tear everything down on unmount.
  useEffect(() => {
    return () => {
      try {
        sourceRef.current?.stop();
      } catch {
        /* already stopped */
      }

      sourceRef.current = null;
      resolveRef.current?.();
      resolveRef.current = null;
      graphRef.current?.ctx.close();
      graphRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!blob) {
      return;
    }

    let cancelled = false;

    blob
      .arrayBuffer()
      .then((bytes) => getGraph().ctx.decodeAudioData(bytes))
      .then(
        (buffer) => {
          if (!cancelled) setDecodeResult({ blob, buffer, error: null });
        },
        (e: unknown) => {
          if (!cancelled) {
            const error = e instanceof Error ? e : new Error(String(e));
            setDecodeResult({ blob, buffer: null, error });
          }
        }
      );

    return () => {
      cancelled = true;
    };
  }, [blob, getGraph]);

  const current = blob && decodeResult?.blob === blob ? decodeResult : null;
  const fullBuffer = current?.buffer ?? null;
  const error = current?.error ?? null;
  const isDecoding = blob !== null && current === null;
  const duration = fullBuffer?.duration ?? 0;

  const selStart = selection?.start;
  const selEnd = selection?.end;
  const clipBuffer = useMemo(() => {
    if (!fullBuffer || selStart === undefined || selEnd === undefined) {
      return null;
    }

    const rate = fullBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor(selStart * rate));
    const endSample = Math.min(fullBuffer.length, Math.floor(selEnd * rate));
    const length = endSample - startSample;
    if (length <= 0) {
      return null;
    }

    // The AudioBuffer constructor needs no AudioContext, so this stays a pure computation.
    const clip = new AudioBuffer({
      numberOfChannels: fullBuffer.numberOfChannels,
      length,
      sampleRate: rate
    });
    for (let ch = 0; ch < fullBuffer.numberOfChannels; ch++) {
      clip.copyToChannel(
        fullBuffer.getChannelData(ch).subarray(startSample, endSample),
        ch
      );
    }
    return clip;
  }, [fullBuffer, selStart, selEnd]);

  const stopClip = useCallback(() => {
    const source = sourceRef.current;
    const gain = gainRef.current;
    if (!source || !gain) {
      return;
    }

    const { ctx } = getGraph();
    const now = ctx.currentTime;
    // 30 ms ramp to silence so stopping mid-word doesn't click.
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.03);
    try {
      source.stop(now + 0.03);
    } catch {
      /* already stopped */
    }
    // The source's onended handler clears state and resolves the play promise.
  }, [getGraph]);

  const playClip = useCallback(async (): Promise<void> => {
    if (!clipBuffer) {
      return;
    }

    // Stop anything already playing and settle its promise.
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        /* already stopped */
      }
      sourceRef.current = null;
      resolveRef.current?.();
      resolveRef.current = null;
    }

    const { ctx, analyser, recordDest } = getGraph();
    // Browsers start AudioContexts suspended until a user gesture.
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = clipBuffer;

    const gain = ctx.createGain();
    source.connect(gain).connect(ctx.destination);
    gain.connect(recordDest); // post-fade, so the export gets the same fades as playback
    source.connect(analyser); // pre-fade tap so the visualizer isn't flattened by fades

    // Schedule fades; shrink them proportionally if the clip is shorter than both together.
    const dur = clipBuffer.duration;
    const scale = Math.min(1, dur / Math.max(fadeIn + fadeOut, 1e-6));
    const fi = fadeIn * scale;
    const fo = fadeOut * scale;
    const now = ctx.currentTime;

    gain.gain.setValueAtTime(fi > 0 ? 0 : 1, now);
    if (fi > 0) gain.gain.linearRampToValueAtTime(1, now + fi);
    gain.gain.setValueAtTime(1, now + dur - fo);
    if (fo > 0) gain.gain.linearRampToValueAtTime(0, now + dur);

    sourceRef.current = source;
    gainRef.current = gain;
    startedAtRef.current = now;
    setIsPlaying(true);

    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        // Only clear state if a newer playback hasn't replaced this one.
        if (sourceRef.current === source) {
          sourceRef.current = null;
          gainRef.current = null;
          setIsPlaying(false);
          resolveRef.current = null;
        }
        resolve();
      };
      source.start(now);
    });
  }, [clipBuffer, fadeIn, fadeOut, getGraph]);

  const getElapsed = useCallback(() => {
    if (!sourceRef.current || !graphRef.current) {
      return 0;
    }

    return graphRef.current.ctx.currentTime - startedAtRef.current;
  }, []);

  return {
    playClip,
    stopClip,
    getElapsed,
    getAnalyser,
    getRecorder,
    requestFrame,
    clipBuffer,
    duration,
    isDecoding,
    isPlaying,
    error
  };
}

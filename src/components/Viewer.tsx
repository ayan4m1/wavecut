import { ChangeEvent, RefObject, useEffect } from 'react';
import { Card, Col, Form, Row } from 'react-bootstrap';

import { formatSeconds, VIDEO_SIZES } from '../utils';
import { AudioSelection, ExportSize } from '../types';

const BAR_GAP = 1; // px
const BAR_COUNT = 64;
// Log-spaced band edges; most lossy audio is low-passed around 16 kHz, so going to Nyquist leaves empty bars.
const MIN_FREQ = 40; // Hz
const MAX_FREQ = 16000; // Hz

interface IProps {
  audioSelection?: AudioSelection;
  bgColor: string;
  exportSize: ExportSize;
  fgColor: string;
  getAnalyzer: () => AnalyserNode;
  isPlaying: boolean;
  maxZoom: number;
  minZoom?: number;
  ref: RefObject<HTMLCanvasElement | null>;
  zoom: number;
  onZoomChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function Viewer({
  audioSelection,
  bgColor,
  exportSize,
  fgColor,
  getAnalyzer,
  isPlaying,
  maxZoom,
  minZoom,
  ref,
  zoom,
  onZoomChange
}: IProps) {
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Only touch the analyser while playing; getAnalyzer lazily creates the AudioContext.
    // When stopped, leave the last drawn frame on the canvas.
    if (!isPlaying) {
      return;
    }

    const analyser = getAnalyzer();
    const binCount = analyser.frequencyBinCount;
    const data = new Uint8Array(binCount);
    const nyquist = analyser.context.sampleRate / 2;

    // edges[b]..edges[b + 1] is the bin range for bar b.
    const edges = Array.from({ length: BAR_COUNT + 1 }, (_, b) => {
      const freq = MIN_FREQ * (MAX_FREQ / MIN_FREQ) ** (b / BAR_COUNT);
      return Math.min(binCount - 1, Math.round((freq / nyquist) * binCount));
    });
    let frame = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      analyser.getByteFrequencyData(data);
      clear();
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = fgColor;

      ctx.beginPath();
      const slot = width / BAR_COUNT;
      const barWidth = Math.max(1, slot - BAR_GAP * dpr);
      for (let i = 0; i < BAR_COUNT; i++) {
        const start = edges[i];
        const end = Math.max(start + 1, edges[i + 1]);
        let peak = 0;
        for (let j = start; j < end && j < binCount; j++) {
          peak = Math.max(peak, data[j]);
        }
        const barHeight = (peak / 255) * height;
        ctx.roundRect(i * slot, height - barHeight, barWidth - 2, barHeight, 4);
      }
      ctx.fill();

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isPlaying, getAnalyzer, ref, bgColor, fgColor]);

  return (
    <Col className="wc-editor d-flex align-items-center" md={10} xs={8}>
      <div className="w-100 p-2">
        <div id="wc-editor-waveform"></div>
        <Row>
          {minZoom !== undefined && (
            <Form.Range
              className="my-2"
              max={maxZoom}
              min={minZoom}
              onChange={onZoomChange}
              step={1}
              value={zoom}
            />
          )}
          {Boolean(audioSelection) && (
            <Card body>
              <Card.Title>
                {Math.round(
                  (audioSelection?.end ?? 0) - (audioSelection?.start ?? 0)
                )}{' '}
                Second Clip
              </Card.Title>
              <Card.Text>
                From {formatSeconds(audioSelection?.start ?? 0)} to{' '}
                {formatSeconds(audioSelection?.end ?? 0)}
              </Card.Text>
            </Card>
          )}
          <canvas
            className="wc-editor-visualizer w-100 my-2 p-4"
            height={VIDEO_SIZES[exportSize][1]}
            ref={ref}
            width={VIDEO_SIZES[exportSize][0]}
          />
        </Row>
      </div>
    </Col>
  );
}

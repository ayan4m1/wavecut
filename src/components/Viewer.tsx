import { ChangeEvent, useEffect, useRef } from 'react';
import { Card, Col, Form, Row } from 'react-bootstrap';

import { formatSeconds } from '../utils';
import { AudioSelection } from '../types';

const BAR_COLOR = '#ff00ff';
const BAR_GAP = 1; // px

interface IProps {
  audioSelection?: AudioSelection;
  getAnalyzer: () => AnalyserNode;
  isPlaying: boolean;
  maxZoom: number;
  minZoom?: number;
  zoom: number;
  onZoomChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function Viewer({
  audioSelection,
  getAnalyzer,
  isPlaying,
  maxZoom,
  minZoom,
  zoom,
  onZoomChange
}: IProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const clear = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Only touch the analyser while playing; getAnalyzer lazily creates the AudioContext.
    if (!isPlaying) {
      clear();
      return;
    }

    const analyser = getAnalyzer();
    const data = new Uint8Array(analyser.frequencyBinCount);
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
      ctx.fillStyle = BAR_COLOR;

      const slot = width / data.length;
      const barWidth = Math.max(1, slot - BAR_GAP * dpr);
      for (let i = 0; i < data.length; i++) {
        const barHeight = (data[i] / 255) * height;
        ctx.fillRect(i * slot, height - barHeight, barWidth, barHeight);
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      clear();
    };
  }, [isPlaying, getAnalyzer]);

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
            ref={canvasRef}
          />
        </Row>
      </div>
    </Col>
  );
}

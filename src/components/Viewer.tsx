import { ChangeEvent } from 'react';
import { Card, Col, Form, Row } from 'react-bootstrap';

import { formatSeconds } from '../utils';
import { AudioSelection } from '../types';

interface IProps {
  audioSelection?: AudioSelection;
  maxZoom: number;
  minZoom?: number;
  zoom: number;
  onZoomChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function Viewer({
  audioSelection,
  maxZoom,
  minZoom,
  zoom,
  onZoomChange
}: IProps) {
  return (
    <Col className="wc-editor d-flex align-items-center" md={10} xs={8}>
      <div className="wc-editor-container p-2">
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
        </Row>
      </div>
    </Col>
  );
}

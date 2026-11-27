import { ColorState, SketchPicker } from 'react-color';
import { ChangeEvent, Fragment, useCallback, useRef, useState } from 'react';
import { Button, ButtonGroup, Col, Form, Overlay } from 'react-bootstrap';

import { ExportSize } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDeleteLeft,
  faPlay,
  faUpload
} from '@fortawesome/free-solid-svg-icons';

interface IProps {
  bgColor: string;
  fgColor: string;
  hasAudio: boolean;
  onAudioUpload: (audioFile: Blob) => void;
  onBgColorChange: (color: string) => void;
  onExportClick: () => void;
  onFgColorChange: (color: string) => void;
  onPlayClick: () => void;
  onResetClick: () => void;
  onSizeChange: (size: ExportSize) => void;
}

export default function SidePanel({
  bgColor,
  fgColor,
  hasAudio,
  onAudioUpload,
  onBgColorChange,
  onExportClick,
  onFgColorChange,
  onPlayClick,
  onResetClick,
  onSizeChange
}: IProps) {
  const bgRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const [showBgColor, setShowBgColor] = useState(false);
  const [showFgColor, setShowFgColor] = useState(false);
  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;

      if (!files || !files.length) {
        return;
      }

      const [file] = files;

      if (!file.type.startsWith('audio/')) {
        // todo: tell the user to pick an audio file
        return;
      }

      if (file.size > 300_000_000) {
        // todo: tell the user they are over limit
        return;
      }

      onAudioUpload(new Blob([await file.arrayBuffer()], { type: file.type }));
    },
    [onAudioUpload]
  );
  const handleBgColorChange = useCallback(
    (color: ColorState) => onBgColorChange(color.hex),
    [onBgColorChange]
  );
  const handleFgColorChange = useCallback(
    (color: ColorState) => onFgColorChange(color.hex),
    [onFgColorChange]
  );
  const toggleShowBgColor = useCallback(
    () => setShowBgColor((prev) => !prev),
    []
  );
  const toggleShowFgColor = useCallback(
    () => setShowFgColor((prev) => !prev),
    []
  );

  return (
    <Col className="p-0" md={2} xs={4}>
      <Form className="wc-side-panel ms-2 ps-2 pt-2">
        <Form.Group>
          <Form.Label>Pick an audio file</Form.Label>
          <Form.Control
            onChange={handleFileChange}
            style={{ width: '95%' }}
            type="file"
          />
        </Form.Group>
        {hasAudio && (
          <Fragment>
            <Form.Group>
              <Form.Label>Video Size</Form.Label>
              <Form.Select
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  onSizeChange(e.target.value as ExportSize)
                }
              >
                {Object.entries(ExportSize).map(([val, size]) => (
                  <option key={val} value={val}>
                    {size}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Background Color</Form.Label>
              <div
                className="wc-color-swatch"
                onClick={toggleShowBgColor}
                ref={bgRef}
                style={{ backgroundColor: bgColor }}
              />
              <Overlay
                placement="bottom"
                show={showBgColor}
                // eslint-disable-next-line react-hooks/refs
                target={bgRef.current}
              >
                {({ ref, style, 'aria-labelledby': labelledBy }) => (
                  <div
                    aria-labelledby={labelledBy}
                    ref={ref}
                    style={{ ...style, zIndex: 1000 }}
                  >
                    <SketchPicker
                      color={bgColor}
                      onChange={handleBgColorChange}
                      presetColors={[]}
                    />
                  </div>
                )}
              </Overlay>
            </Form.Group>
            <Form.Group>
              <Form.Label>Foreground Color</Form.Label>
              <div
                className="wc-color-swatch"
                onClick={toggleShowFgColor}
                ref={fgRef}
                style={{ backgroundColor: fgColor }}
              />
              <Overlay
                placement="bottom"
                show={showFgColor}
                // eslint-disable-next-line react-hooks/refs
                target={fgRef.current}
              >
                {({ ref, style, 'aria-labelledby': labelledBy }) => (
                  <div
                    aria-labelledby={labelledBy}
                    ref={ref}
                    style={{ ...style, zIndex: 1000 }}
                  >
                    <SketchPicker
                      color={fgColor}
                      onChange={handleFgColorChange}
                      presetColors={[]}
                    />
                  </div>
                )}
              </Overlay>
            </Form.Group>
            <Form.Group className="mt-2">
              <ButtonGroup>
                <Button onClick={onPlayClick}>
                  <FontAwesomeIcon icon={faPlay} /> Play
                </Button>
                <Button onClick={onResetClick} variant="danger">
                  <FontAwesomeIcon icon={faDeleteLeft} /> Clear
                </Button>
                <Button onClick={onExportClick} variant="success">
                  <FontAwesomeIcon icon={faUpload} /> Export
                </Button>
              </ButtonGroup>
            </Form.Group>
          </Fragment>
        )}
      </Form>
    </Col>
  );
}

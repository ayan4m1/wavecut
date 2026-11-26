import { ChangeEvent, Fragment, useCallback } from 'react';
import { Button, ButtonGroup, Col, Form } from 'react-bootstrap';
import { ExportSize } from '../types';

interface IProps {
  hasAudio: boolean;
  onAudioUpload: (audioFile: Blob) => void;
  onExportClick: () => void;
  onPlayClick: () => void;
  onResetClick: () => void;
  onSizeChange: (size: ExportSize) => void;
}

export default function SidePanel({
  hasAudio,
  onAudioUpload,
  onExportClick,
  onPlayClick,
  onResetClick,
  onSizeChange
}: IProps) {
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
            <Form.Group className="mt-2">
              <ButtonGroup>
                <Button onClick={onPlayClick}>Play</Button>
                <Button onClick={onResetClick} variant="danger">
                  Clear
                </Button>
                <Button onClick={onExportClick} variant="success">
                  Export
                </Button>
              </ButtonGroup>
            </Form.Group>
          </Fragment>
        )}
      </Form>
    </Col>
  );
}

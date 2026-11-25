import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Col, Form } from 'react-bootstrap';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js';

export default function Editor() {
  const wavesurfer = useRef<WaveSurfer>(null);
  const [audioRegion, setAudioRegion] = useState<Region>();
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

      wavesurfer.current?.loadBlob(
        new Blob([await file.arrayBuffer()], { type: file.type })
      );
    },
    []
  );

  useEffect(() => {
    if (wavesurfer.current) {
      return;
    }

    wavesurfer.current = WaveSurfer.create({
      container: '#wc-editor-waveform'
    });
    wavesurfer.current.setOptions({
      dragToSeek: false
    });
    const regions = wavesurfer.current.registerPlugin(RegionsPlugin.create());

    regions.on('region-created', (region) =>
      setAudioRegion((prev) => {
        prev?.remove();
        return region;
      })
    );
    regions.on('region-updated', (region) => setAudioRegion(region));

    regions.enableDragSelection({
      avoidOverlapping: true,
      color: '#00ff0099',
      minLength: 5,
      maxLength: 30
    });
  }, [wavesurfer]);

  return (
    <Col className="wc-editor p-2" md={10} xs={8}>
      <div id="wc-editor-waveform"></div>
      {JSON.stringify({ start: audioRegion?.start, end: audioRegion?.end })}
      <Form.Group>
        <Form.Label>Pick an audio file</Form.Label>
        <Form.Control onChange={handleFileChange} type="file" />
      </Form.Group>
      {Boolean(audioRegion) && (
        <Form.Group>
          <Button onClick={() => audioRegion?.play()}>Play</Button>
        </Form.Group>
      )}
    </Col>
  );
}

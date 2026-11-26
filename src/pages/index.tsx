import { Card, Col, Form, Row } from 'react-bootstrap';
import WaveSurfer from 'wavesurfer.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.js';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js';

import SidePanel from '../components/SidePanel';
import { formatSeconds } from '../utils';
import { AudioSelection } from '../types';

const MAX_ZOOM = 500; // px per second

export const Component = () => {
  const wavesurfer = useRef<WaveSurfer>(null);
  const [audioRegion, setAudioRegion] = useState<Region>();
  const [audioSelection, setAudioSelection] = useState<AudioSelection>();
  const [zoom, setZoom] = useState(0);
  const [minZoom, setMinZoom] = useState<number>();
  const handleAudioUpload = useCallback(async (audioFile: Blob) => {
    wavesurfer.current?.loadBlob(audioFile);
  }, []);
  const handleExportClick = useCallback(() => {}, []);
  const handlePlayClick = useCallback(
    () => audioRegion?.play(true),
    [audioRegion]
  );
  const handleResetClick = useCallback(() => {
    audioRegion?.remove();
    wavesurfer.current?.stop();
    setAudioSelection(undefined);
    setAudioRegion(undefined);
  }, [audioRegion]);
  const handleZoomChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) =>
      wavesurfer.current?.zoom(Number(e.target.value)),
    []
  );

  useEffect(() => {
    if (wavesurfer.current) {
      return;
    }

    wavesurfer.current = WaveSurfer.create({
      container: '#wc-editor-waveform',
      waveColor: '#fefefe',
      dragToSeek: false,
      barRadius: 4
    });
    const regions = wavesurfer.current.registerPlugin(RegionsPlugin.create());
    wavesurfer.current.registerPlugin(ZoomPlugin.create({ maxZoom: MAX_ZOOM }));

    wavesurfer.current.on('ready', (duration) => {
      // px/sec at which the whole file fits the container; anything lower looks identical
      const fit = (wavesurfer.current?.getWidth() ?? 0) / duration;
      setMinZoom(fit);
      wavesurfer.current?.zoom(fit);
    });
    wavesurfer.current.on('zoom', (minPxPerSec) => setZoom(minPxPerSec));

    regions.on('region-created', (region) => {
      setAudioRegion((prev) => {
        prev?.remove();
        return region;
      });
      setAudioSelection({
        start: region.start,
        end: region.end
      });
    });
    regions.on('region-updated', (region) =>
      setAudioSelection({
        start: region.start,
        end: region.end
      })
    );

    regions.enableDragSelection({
      color: '#ff00ff99',
      minLength: 5,
      maxLength: 30
    });
  }, [wavesurfer]);

  useEffect(() => {
    if (!audioRegion) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== '[' && event.key !== ']') {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }

      event.preventDefault();

      if (event.key === ' ') {
        if (!event.repeat) {
          audioRegion.play(true);
        }
        return;
      }

      const duration = wavesurfer.current?.getDuration() ?? 0;
      const step = event.key === '[' ? -0.1 : 0.1;
      const delta = Math.max(
        -audioRegion.start,
        Math.min(duration - audioRegion.end, step)
      );

      if (delta === 0) {
        return;
      }

      audioRegion.setOptions({
        start: audioRegion.start + delta,
        end: audioRegion.end + delta
      });
      setAudioSelection({ start: audioRegion.start, end: audioRegion.end });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioRegion]);

  return (
    <Row>
      <Col className="wc-editor p-2" md={10} xs={8}>
        <div id="wc-editor-waveform"></div>
        {minZoom !== undefined && (
          <Form.Range
            className="my-2"
            max={MAX_ZOOM}
            min={minZoom}
            onChange={handleZoomChange}
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
      </Col>
      <SidePanel
        hasAudio={Boolean(audioRegion)}
        onAudioUpload={handleAudioUpload}
        onExportClick={handleExportClick}
        onPlayClick={handlePlayClick}
        onResetClick={handleResetClick}
      />
    </Row>
  );
};

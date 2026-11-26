import { Row } from 'react-bootstrap';
import WaveSurfer from 'wavesurfer.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.js';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js';

import Viewer from '../components/Viewer';
import SidePanel from '../components/SidePanel';
import useKeyEvents from '../hooks/useKeyEvents';
import { AudioSelection } from '../types';
import useWebAudio from '../hooks/useWebAudio';

const MAX_ZOOM = 500; // px per second
const MIN_LENGTH = 5; // seconds
const MAX_LENGTH = 90; // seconds

export const Component = () => {
  const wavesurfer = useRef<WaveSurfer>(null);
  const [audioFile, setAudioFile] = useState<Blob>();
  const [audioRegion, setAudioRegion] = useState<Region>();
  const [audioSelection, setAudioSelection] = useState<AudioSelection>();
  const [zoom, setZoom] = useState(0);
  const [minZoom, setMinZoom] = useState<number>();
  const { playClip, stopClip, getAnalyser, isPlaying } = useWebAudio(
    audioFile,
    audioSelection
  );
  const handleAudioUpload = useCallback(async (audioFile: Blob) => {
    wavesurfer.current?.loadBlob(audioFile);
    setAudioFile(audioFile);
  }, []);
  const handleExportClick = useCallback(() => {
    wavesurfer.current?.stop();
    playClip();
  }, [playClip]);
  const handlePlayClick = useCallback(() => {
    stopClip();
    audioRegion?.play(true);
  }, [audioRegion, stopClip]);
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
      dragToSeek: false
    });
    const regions = wavesurfer.current.registerPlugin(RegionsPlugin.create());
    wavesurfer.current.registerPlugin(ZoomPlugin.create({ maxZoom: MAX_ZOOM }));

    wavesurfer.current.on('ready', (duration) => {
      // px/sec at which the whole file fits the container; anything lower looks identical
      const fit = Math.floor((wavesurfer.current?.getWidth() ?? 0) / duration);
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
      minLength: MIN_LENGTH,
      maxLength: MAX_LENGTH
    });
  }, [wavesurfer]);

  useKeyEvents(wavesurfer, audioRegion, setAudioSelection);

  return (
    <Row>
      <Viewer
        audioSelection={audioSelection}
        getAnalyzer={getAnalyser}
        isPlaying={isPlaying}
        maxZoom={MAX_ZOOM}
        minZoom={minZoom}
        onZoomChange={handleZoomChange}
        zoom={zoom}
      />
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

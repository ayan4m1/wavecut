import { Row } from 'react-bootstrap';
import WaveSurfer from 'wavesurfer.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.js';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js';

import Viewer from '../components/Viewer';
import SidePanel from '../components/SidePanel';
import useKeyEvents from '../hooks/useKeyEvents';
import useWebAudio from '../hooks/useWebAudio';
import { AudioSelection, ExportSize } from '../types';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { pickMimeType } from '../utils';

const MAX_ZOOM = 500; // px per second
const MIN_LENGTH = 5; // seconds
const MAX_LENGTH = 90; // seconds

export const Component = () => {
  const wavesurfer = useRef<WaveSurfer>(null);
  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioFile, setAudioFile] = useState<Blob>();
  const [audioRegion, setAudioRegion] = useState<Region>();
  const [audioSelection, setAudioSelection] = useState<AudioSelection>();
  const [exportSize, setExportSize] = useState<ExportSize>(ExportSize.Square);
  const [bgColor, setBgColor] = useState('#00000000');
  const [fgColor, setFgColor] = useState('#ff00ff99');
  const [zoom, setZoom] = useState(0);
  const [minZoom, setMinZoom] = useState<number>();
  const { playClip, stopClip, getAnalyser, getRecorder, isPlaying } =
    useWebAudio(audioFile, audioSelection, canvasRef);
  const loadFfmpeg = async () => {
    const baseURL =
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    // toBlobURL is used to bypass CORS issue, urls with the same
    // domain can be used directly.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      )
    });
  };
  const handleAudioUpload = useCallback(async (audioFile: Blob) => {
    wavesurfer.current?.loadBlob(audioFile);
    setAudioFile(audioFile);
  }, []);
  const handleExportClick = useCallback(async () => {
    wavesurfer.current?.stop();

    // todo: set global disabled state flag

    const recorder = getRecorder();
    const mimeType = pickMimeType();

    // load ffmpeg.wasm core only if needed
    if (mimeType?.includes('webm')) {
      await loadFfmpeg();
    }

    playClip();
    recorder.start();
  }, [playClip, getRecorder]);
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

    return () => wavesurfer.current?.destroy();
  }, [wavesurfer]);

  useKeyEvents(wavesurfer, audioRegion, setAudioSelection);

  return (
    <Row>
      <title>Wavecut</title>
      <Viewer
        audioSelection={audioSelection}
        bgColor={bgColor}
        exportSize={exportSize}
        fgColor={fgColor}
        getAnalyzer={getAnalyser}
        isPlaying={isPlaying}
        maxZoom={MAX_ZOOM}
        minZoom={minZoom}
        onZoomChange={handleZoomChange}
        ref={canvasRef}
        zoom={zoom}
      />
      <SidePanel
        bgColor={bgColor}
        fgColor={fgColor}
        hasAudio={Boolean(audioRegion)}
        onAudioUpload={handleAudioUpload}
        onBgColorChange={setBgColor}
        onExportClick={handleExportClick}
        onFgColorChange={setFgColor}
        onPlayClick={handlePlayClick}
        onResetClick={handleResetClick}
        onSizeChange={setExportSize}
      />
    </Row>
  );
};

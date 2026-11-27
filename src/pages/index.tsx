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
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { pickMimeType } from '../utils';

const MAX_ZOOM = 500; // px per second
const MIN_LENGTH = 5; // seconds
const MAX_LENGTH = 90; // seconds

export const Component = () => {
  const wavesurfer = useRef<WaveSurfer>(null);
  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodeProgress, setEncodeProgress] = useState<number>();
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
    if (isExporting) {
      return;
    }

    setIsExporting(true);

    wavesurfer.current?.stop();

    const recorder = getRecorder();
    const mimeType = pickMimeType();

    // load ffmpeg.wasm core only if needed
    if (mimeType?.includes('webm')) {
      await loadFfmpeg();
    }

    recorder.addEventListener('dataavailable', async (e: BlobEvent) => {
      let blob: Blob;

      if (mimeType?.includes('webm')) {
        ffmpegRef.current.on('progress', ({ time }) => {
          const currentSeconds = time / 1_000_000;
          const progress = Math.min(
            Math.max(
              currentSeconds /
                ((audioSelection?.end ?? 0) - (audioSelection?.start ?? 0)),
              0
            ),
            1
          );

          console.dir(progress);
          setEncodeProgress(progress);
        });

        await ffmpegRef.current.writeFile(
          'input.webm',
          await fetchFile(e.data)
        );

        setIsEncoding(true);

        // prettier-ignore
        const args = [
          '-i',
          'input.webm',

          // Video: H.264, the format every platform accepts
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '21',
          '-profile:v', 'high',
          '-level:v', '4.1',
          '-pix_fmt', 'yuv420p',
          '-r', '30', // constant 30 fps (see below)
          '-g', '60', // a keyframe every 2 s, which helps seeking and platform processing

          // Audio: AAC stereo
          '-c:a', 'aac',
          '-b:a', '192k',
          '-ar', '48000',
          '-ac', '2',

          // Index at the front of the file
          '-movflags',
          '+faststart',

          'output.mp4'
        ];

        await ffmpegRef.current.exec(args);

        setIsEncoding(false);

        const data = (await ffmpegRef.current.readFile(
          'output.mp4'
        )) as Uint8Array<ArrayBuffer>;
        blob = new Blob([data], { type: 'video/mp4' });
      } else {
        blob = e.data;
      }

      const url = URL.createObjectURL(blob);
      const aTag = document.createElement('a');
      aTag.href = url;
      aTag.download = `test.mp4`;

      document.body.appendChild(aTag);
      aTag.click();
      document.body.removeChild(aTag);

      setTimeout(() => {
        URL.revokeObjectURL(url);

        if (mimeType?.includes('webm')) {
          ffmpegRef.current.deleteFile('input.webm');
          ffmpegRef.current.deleteFile('output.mp4');
        }
      }, 100);
    });

    recorder.start();
    await playClip();
    recorder.stop();
  }, [playClip, getRecorder, isExporting, audioSelection]);
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
        encodeProgress={encodeProgress}
        exportSize={exportSize}
        fgColor={fgColor}
        getAnalyzer={getAnalyser}
        isEncoding={isEncoding}
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

import { RefObject, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Region } from 'wavesurfer.js/dist/plugins/regions.js';

import { AudioSelection } from '../types';

export default function useKeyEvents(
  wavesurfer: RefObject<WaveSurfer | null>,
  audioRegion: Region | undefined,
  setAudioSelection: (selection: AudioSelection) => void
) {
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
  }, [audioRegion, wavesurfer, setAudioSelection]);
}

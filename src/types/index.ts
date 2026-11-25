export type Episode = {
  content: Blob;
  title: string;
  artworkUrl: string;
};

export type AudioSelection = {
  start: number;
  end: number;
};

export type ExportStyle = {
  colors: {
    fg: string;
    bg: string;
    text: string;
  };
  text: {
    outline: boolean;
  };
};

export type ExportState = {
  status: 'init' | 'process' | 'done';
  progress: number;
};

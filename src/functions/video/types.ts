import { VideoSourceType } from "@ournet/videos-domain";

export type HtmlExploredVideo = {
  sourceType: VideoSourceType;
  sourceId: string;
  width?: number;
  height?: number;

  image?: string;
};

export type HtmlExploredVideoInfo = {
  url: string;
  // sourceType?: VideoSourceType
  width?: number;
  height?: number;
  image?: string;
};

export type Rect = (x: number, y: number, width: number, height: number, color: string) => void;
export type PixelText = (text: string, x: number, y: number, color: string, size?: number) => void;
export type Polygon = (points: number[][], color: string) => void;
export interface DrawingHelpers {
  rect: Rect;
  pixelText: PixelText;
  reducedParticleMotion: MediaQueryList;
}

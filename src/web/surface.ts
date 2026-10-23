import type { Renderer } from '../player/renderer';

/** A renderer of the web: draws on a canvas, on the main thread or in a worker. */
export interface WebSurface extends Renderer {
    /** Where to draw, and its size in device pixels. */
    attach(canvas: HTMLCanvasElement, pixels: number): void;
    resize(pixels: number): void;
    /** Frames per second at most; 0 for every display frame. */
    setFrameRate(limit: number): void;
    destroy(): void;
}

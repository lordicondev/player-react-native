/**
 * What draws an icon for the player: the native view on iOS and Android, the WebAssembly
 * runtime on the web. Commands are sent without waiting for an answer; the renderer reports
 * back through the player's `complete()`. It keeps the frame itself, the player keeps the rest.
 */
export interface Renderer {
    /**
     * Colours and stroke: every colour of the icon (`#rrggbb` by name), and the stroke width
     * 1..3, or 0 for an icon without a stroke setting. `tint` (`#rrggbb`) draws the whole icon in
     * one colour, its alpha kept; null for the icon's colours.
     */
    look(colors: Readonly<Record<string, string>>, stroke: number, tint: string | null): void;
    /**
     * Plays frames `[begin, end]`, both included, absolute as markers count them. The frame
     * moves to the start in the play direction.
     */
    segment(begin: number, end: number): void;
    /**
     * `direction`: 1 forwards, -1 backwards. `rest`: seconds on the last frame between loop
     * rounds; a pause holds it, the loop turned off during it ends playback (`complete`).
     */
    playback(speed: number, direction: 1 | -1, loop: boolean, rest: number): void;
    /** Plays from the current frame. The renderer answers with `complete(token)` at the end. */
    play(token: number): void;
    pause(): void;
    /** Shows a frame (absolute). */
    seek(frame: number): void;
    /**
     * The frame the renderer is on (absolute), read now; NaN when it does not know yet, e.g.
     * while commands sent to another thread are still on their way.
     */
    frame(): number;
}

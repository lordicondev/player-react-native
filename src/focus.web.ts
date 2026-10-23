/**
 * Whether a focus came from the keyboard: `:focus-visible`, not the focus a click gives a button
 * (which would play `hover` a second time).
 */
export function fromKeyboard(event: unknown): boolean {
    const target = (event as { target?: unknown } | null)?.target as Element | undefined;
    try {
        return typeof target?.matches !== 'function' || target.matches(':focus-visible');
    } catch {
        return true; // a browser without :focus-visible
    }
}

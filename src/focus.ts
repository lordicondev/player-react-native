/** Whether a focus came from the keyboard (or a TV remote): on iOS and Android every focus does. */
export function fromKeyboard(_event: unknown): boolean {
    return true;
}

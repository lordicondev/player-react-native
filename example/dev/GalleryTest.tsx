// The gallery in the self-test: every example mounts in turn, and the phase fails on a render
// error or a message of the library (an unknown trigger or state, a colour it cannot read, an
// icon that did not load). Other warnings are reported, not failed: they come from React Native
// and other packages, and differ by platform.
import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EXAMPLES } from '../gallery';

const SHOWN_MS = 1500;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Shows the examples one by one (`show`), and throws on the first that fails. */
export async function checkGallery(
    show: (id: string | null) => void,
    say: (line: string) => void,
): Promise<void> {
    const messages: string[] = [];
    const original = { warn: console.warn, error: console.error };
    const capture =
        (level: 'warn' | 'error') =>
        (...args: unknown[]) => {
            messages.push(`${level}: ${args.map(String).join(' ')}`);
            original[level](...args);
        };
    console.warn = capture('warn');
    console.error = capture('error');
    try {
        for (const example of EXAMPLES) {
            messages.length = 0;
            show(example.id);
            await sleep(SHOWN_MS);
            const failures = messages.filter(
                (m) => m.includes('@lordicon') || m.includes('GALLERY'),
            );
            if (failures.length) throw new Error(`gallery ${example.id}: ${failures[0]}`);
            for (const other of new Set(messages))
                say(`gallery ${example.id}: note: ${other.slice(0, 120)}`);
        }
        show(null);
        say(`gallery: ${EXAMPLES.length} examples mounted`);
    } finally {
        console.warn = original.warn;
        console.error = original.error;
    }
}

/** The example being checked, inside an error boundary that reports what broke it. */
export function GalleryScene({ id }: { id: string }) {
    const example = EXAMPLES.find((e) => e.id === id)!;
    const { Screen } = example;
    return (
        <View style={example.fill ? styles.fill : styles.page}>
            <Boundary key={id} id={id}>
                <Screen />
            </Boundary>
        </View>
    );
}

class Boundary extends Component<{ id: string; children: ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: Error) {
        console.error(`GALLERY ${this.props.id} threw: ${error.message}`);
    }

    render() {
        return this.state.failed ? <Text>{this.props.id} failed</Text> : this.props.children;
    }
}

const styles = StyleSheet.create({
    page: { padding: 8 },
    fill: { height: 420 },
});

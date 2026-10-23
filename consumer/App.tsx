// What every consumer app shows: <LordIcon> as an app gets it from npm. Passes when every icon
// loads, play() plays to the end and the library said nothing (an unknown trigger, a colour it
// cannot read, a file that did not load). Reports `LORDICON_CONSUMER …` to the log and on screen.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LordIcon, LordIconProvider, type LordIconHandle } from '@lordicon/react-native';
import { assets } from './consumer-config';
import download from './icons/download.json';
import morphSelect from './icons/morph-select.json';

const ICONS = 4;
// On the web, ?workers draws in render workers (the worker file has to reach the build too).
const search = typeof window === 'undefined' ? '' : (window.location?.search ?? '');
const thread = search.includes('workers') ? 'background' : undefined;
const TIMEOUT_MS = 30000;
const problems: string[] = [];
for (const level of ['warn', 'error'] as const) {
    const original = console[level];
    console[level] = (...args: unknown[]) => {
        const text = args.map(String).join(' ');
        if (text.includes('@lordicon')) problems.push(text);
        original(...args);
    };
}
const say = (line: string) => console.log(`LORDICON_CONSUMER ${line}`);

export default function App() {
    const icon = useRef<LordIconHandle>(null);
    const [ready, setReady] = useState(0);
    const [result, setResult] = useState('…');
    const onReady = () => setReady((n) => n + 1);
    const onError = (error: Error) => problems.push(error.message);

    useEffect(() => {
        const timer = setTimeout(
            () => finish(`FAIL: ${ready} of ${ICONS} icons ready`),
            TIMEOUT_MS,
        );
        let done = false;
        function finish(line: string) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            setResult(line);
            say(line);
        }
        if (problems.length) finish(`FAIL: ${problems[0]}`);
        else if (ready === ICONS) {
            void icon.current?.play({ state: 'hover-pinch' }).then((played) => {
                if (problems.length) finish(`FAIL: ${problems[0]}`);
                else finish(played ? 'PASS' : 'FAIL: play() did not play to the end');
            });
        }
        return () => clearTimeout(timer);
    }, [ready]);

    return (
        <LordIconProvider assets={assets} render={{ thread }}>
            <View style={styles.page}>
                <Text>
                    {ready}/{ICONS} ready: {result}
                </Text>
                <View style={styles.row}>
                    <LordIcon
                        ref={icon}
                        icon={download}
                        size={48}
                        onReady={onReady}
                        onError={onError}
                    />
                    <LordIcon
                        icon={download}
                        state="in-reveal"
                        trigger="in"
                        size={48}
                        onReady={onReady}
                        onError={onError}
                    />
                    <LordIcon
                        icon={download}
                        state="loop-cycle"
                        trigger="loop(500)"
                        size={48}
                        onReady={onReady}
                        onError={onError}
                    />
                    <LordIcon
                        icon={morphSelect}
                        state="morph-select"
                        value={ready === ICONS}
                        color="rgb(0, 122, 255)"
                        size={48}
                        onReady={onReady}
                        onError={onError}
                    />
                </View>
            </View>
        </LordIconProvider>
    );
}

const styles = StyleSheet.create({
    page: { flex: 1, padding: 24, paddingTop: 64, gap: 16, backgroundColor: '#fff' },
    row: { flexDirection: 'row', gap: 16 },
});

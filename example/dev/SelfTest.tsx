// Self-test of the library on a device, for e2e-android.sh and CI: for each render mode, 48 icons
// load (no onError), every play() resolves true (commands reach the native views, completions
// come back), a state change plays, and icons mount again after an unmount (the registry lets
// go of them and takes them back); then the triggers on real views (TriggerTest.tsx) and every
// example of the gallery (GalleryTest.tsx). Reports to the log as `LORDICON_SELFTEST ...` and on
// screen.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
    LordIcon,
    LordIconProvider,
    type LordIconHandle,
    type RenderOptions,
} from '@lordicon/react-native';
import { checkGallery, GalleryScene } from './GalleryTest';
import { checkTriggers, newScene, TriggerScene, type Scene, type SceneValues } from './TriggerTest';

const COUNT = 48;
const PHASES: { name: string; render: RenderOptions }[] = [
    { name: 'background', render: { thread: 'background' } },
    { name: 'ui', render: { thread: 'ui' } },
    { name: 'pool 3', render: { thread: 'background', workers: 3 } },
    { name: 'background 30 fps', render: { thread: 'background', frameRate: 30 } },
];

function log(line: string) {
    console.log(`LORDICON_SELFTEST ${line}`);
}

function timeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${what}: timed out`)), ms),
        ),
    ]);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function SelfTest({ icons, tap = false }: { icons: object[]; tap?: boolean }) {
    const [run, setRun] = useState<{ phase: number; generation: number } | null>(null);
    const [values, setValues] = useState<SceneValues | null>(null);
    const [example, setExample] = useState<string | null>(null);
    const scene = useRef<Scene>(newScene());
    const [lines, setLines] = useState<string[]>([]);
    const handles = useRef<(LordIconHandle | null)[]>([]);
    const counts = useRef({ ready: 0, errors: 0 });

    useEffect(() => {
        // Unmounted (e.g. the activity made again): this run stops, the new one reports.
        let cancelled = false;
        const say = (line: string) => {
            if (cancelled) return;
            log(line);
            setLines((all) => [...all, line]);
        };
        const waitReady = async (what: string) => {
            const start = Date.now();
            while (counts.current.ready < COUNT && counts.current.errors === 0) {
                if (Date.now() - start > 30000) {
                    throw new Error(`${what}: ${counts.current.ready} of ${COUNT} ready`);
                }
                await sleep(50);
            }
            if (counts.current.errors) throw new Error(`${what}: ${counts.current.errors} onError`);
        };
        const mount = async (phase: number, generation: number) => {
            counts.current = { ready: 0, errors: 0 };
            handles.current = [];
            setRun({ phase, generation });
            await waitReady(`${PHASES[phase].name}: load`);
        };
        const playAll = async (what: string) => {
            const all = handles.current.slice(0, COUNT);
            if (all.length < COUNT || all.some((h) => !h)) throw new Error(`${what}: refs missing`);
            const results: (boolean | undefined)[] = Array.from({ length: COUNT }, () => undefined);
            const plays = all.map((h, i) =>
                h!.play({ from: 'start' }).then((r) => (results[i] = r)),
            );
            try {
                await timeout(Promise.all(plays), 30000, what);
            } catch (error) {
                // Where each pending icon is: playing, its frame, its segment.
                const pending = results.flatMap((r, i) => {
                    if (r !== undefined) return [];
                    const h = all[i]!;
                    return [
                        `${i} (${h.playing ? 'playing' : 'stopped'} ${h.frame} of ${h.segment.join('-')})`,
                    ];
                });
                throw new Error(
                    `${(error as Error).message}, pending: icons ${pending.join(', ')}`,
                );
            }
            const failed = results.flatMap((r, i) => (r ? [] : [i]));
            if (failed.length) throw new Error(`${what}: false for icons ${failed.join(' ')}`);
        };

        // The player's API on a real view: segments, frames read from it, pause, colours.
        const checkApi = async (what: string) => {
            const icon = handles.current[0]!;
            const fail = (message: string) => {
                throw new Error(`${what}: ${message}`);
            };
            const [first] = icon.segment;
            icon.segment = [first, first + 20];
            const started = Date.now();
            const done = await timeout(icon.play(), 10000, `${what}: segment`);
            if (!done || icon.frame !== first + 19) fail(`segment ended at ${icon.frame}`);
            // As long as the animation is, whatever the frame rate limit.
            const seconds = (Date.now() - started) / 1000;
            const expected = 19 / icon.frameRate;
            if (seconds < expected * 0.8 || seconds > expected + 0.4) {
                fail(`segment took ${seconds.toFixed(2)} s, not ${expected.toFixed(2)} s`);
            }

            icon.seek(first + 10);
            await sleep(200);
            if (icon.frame !== first + 10) fail(`seek: frame ${icon.frame}`);
            if (Math.abs(icon.progress - 10 / 19) > 1e-6) fail(`progress ${icon.progress}`);

            icon.segment = null;
            icon.loop = true;
            void icon.play({ from: 'start' });
            await sleep(400);
            const moving = icon.frame;
            if (!(moving > icon.segment[0])) fail(`playing: frame ${moving}`);
            icon.pause();
            await sleep(200);
            const paused = icon.frame;
            await sleep(300);
            if (icon.frame !== paused) fail(`paused: ${paused}, then ${icon.frame}`);
            icon.loop = false;
            icon.stop();

            let refreshed = 0;
            const off = icon.on('refresh', () => refreshed++);
            icon.colors.primary = '#ff0000';
            icon.stroke = 'bold';
            icon.colors = null;
            icon.stroke = null;
            off();
            if (refreshed !== 4) fail(`${refreshed} refresh events`);
        };

        (async () => {
            const start = Date.now();
            let generation = 0;
            for (let phase = 0; phase < PHASES.length; phase++) {
                const name = PHASES[phase].name;
                await mount(phase, ++generation);
                say(`${name}: ${COUNT} icons ready`);
                await playAll(`${name}: play`);
                say(`${name}: every play() completed`);
                // An icon with more than one state.
                const first = handles.current.find((h) => h!.states.length > 1)!;
                const state = first.states.find((s) => s.name !== first.state)?.name;
                if (state) {
                    const done = await timeout(first.play({ state }), 10000, `${name}: state`);
                    if (!done || first.state !== state) throw new Error(`${name}: state ${state}`);
                    say(`${name}: state ${state} played`);
                }
                await checkApi(`${name}: api`);
                say(`${name}: segment, frame, pause, colours`);
            }
            // Unmount everything: the registry releases the icons after its delay. Mount again.
            setRun(null);
            await sleep(1500);
            await mount(0, ++generation);
            await playAll('remount: play');
            say('remount: icons loaded and played again');
            setRun(null);
            scene.current = newScene();
            setValues({ busy: false, on: false, count: 0 });
            await checkTriggers(
                scene.current,
                (next) => setValues((now) => (now ? { ...now, ...next } : now)),
                say,
                tap,
            );
            setValues(null);
            await checkGallery(setExample, say);
            say(`PASS in ${((Date.now() - start) / 1000).toFixed(1)} s`);
        })().catch((error: Error) => {
            if (!cancelled) say(`FAIL: ${error.message}`);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <View style={styles.flex}>
            <View style={styles.status}>
                {lines.map((line, i) => (
                    <Text key={i} style={styles.line}>
                        {line}
                    </Text>
                ))}
            </View>
            {values && <TriggerScene values={values} scene={scene} />}
            {example && <GalleryScene id={example} />}
            {run && (
                <LordIconProvider render={PHASES[run.phase].render}>
                    <View key={run.generation} style={styles.grid}>
                        {Array.from({ length: COUNT }, (_, i) => (
                            <LordIcon
                                key={i}
                                ref={(handle) => {
                                    handles.current[i] = handle;
                                }}
                                icon={icons[i % icons.length]}
                                size={40}
                                onReady={() => counts.current.ready++}
                                onError={() => counts.current.errors++}
                            />
                        ))}
                    </View>
                </LordIconProvider>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#fff' },
    status: { padding: 8 },
    line: { color: '#121331', fontSize: 13, fontVariant: ['tabular-nums'] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8 },
});

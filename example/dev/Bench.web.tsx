// A bench of the web renderers for scripts (see ../../docs: m3-web.md): N looping icons on the
// main thread (`mode=inline`) or in render workers (`mode=worker`). Parameters in the address:
// ?tab=bench&icon=gradient-3094&count=100&size=96&mode=worker&workers=2
// `icon=mix`: every icon of the example in turn (as the native list); `animate=10`: only that many
// loop, the rest rest on a frame (default: all loop).
// The page exposes `ready` (every icon loaded), `bench.frames()` (main-thread frames) and
// `bench.workers()` (each worker's frames and time per frame).
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { LordIcon, LordIconProvider, type LordIconHandle } from '@lordicon/react-native';
import { workerStats } from '../../src/web/workers';

const params = new URLSearchParams(globalThis.location?.search ?? '');

function BenchIcon(props: {
    icon: object;
    size: number;
    offset: number;
    animate: boolean;
    onReady: () => void;
}) {
    const { icon, size, offset, animate, onReady } = props;
    const ref = useRef<LordIconHandle>(null);
    return (
        <LordIcon
            ref={ref}
            icon={icon}
            size={size}
            onReady={() => {
                const player = ref.current!;
                player.loop = true;
                player.seek(player.segment[0] + (offset % player.frameCount));
                if (animate) void player.play();
                onReady();
            }}
        />
    );
}

export function Bench({ icons }: { icons: Record<string, object> }) {
    const names = Object.keys(icons);
    const mix = params.get('icon') === 'mix';
    const icon = icons[params.get('icon') ?? 'lock'] ?? icons.lock;
    const count = Number(params.get('count') ?? 20);
    const animate = params.get('animate') ? Number(params.get('animate')) : count;
    const every = animate > 0 ? Math.max(1, Math.floor(count / animate)) : 0;
    const size = Number(params.get('size') ?? 96);
    const worker = params.get('mode') === 'worker';
    const workers = params.get('workers') ? Number(params.get('workers')) : undefined;
    const ready = useRef(0);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        let frames = 0;
        let running = true;
        const tick = () => {
            frames++;
            if (running) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        Object.assign(globalThis, { bench: { frames: () => frames, workers: workerStats } });
        if (count === 0) Object.assign(globalThis, { ready: true }); // an empty page, a baseline
        return () => {
            running = false;
        };
    }, []);

    return (
        <LordIconProvider render={worker ? { thread: 'background', workers } : {}}>
            <View style={styles.grid}>
                {Array.from({ length: count }, (_, i) => (
                    <BenchIcon
                        key={i}
                        icon={mix ? icons[names[i % names.length]] : icon}
                        size={size}
                        offset={i * 7}
                        animate={every > 0 && i % every === 0}
                        onReady={() => {
                            if (++ready.current === count)
                                Object.assign(globalThis, { ready: true });
                        }}
                    />
                ))}
            </View>
        </LordIconProvider>
    );
}

const styles = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
});

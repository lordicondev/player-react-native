// The self-test's triggers phase (SelfTest.tsx): icons with triggers on real views, driven
// through `value` and checked through their refs and onComplete. With `tap`, a real tap on a
// LordIcon.Target from outside (e2e-android.sh taps what the log asks for).
import type { RefObject } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    LordIcon,
    LordIconProvider,
    type CompleteDetail,
    type LordIconHandle,
} from '@lordicon/react-native';
import download from '../icons/download.json';
import lockAlt from '../icons/dev/lock-alt.json';
import morphSelect from '../icons/dev/morph-select.json';

export interface SceneValues {
    busy: boolean;
    on: boolean;
    count: number;
}

type Name = 'loop' | 'busy' | 'morph' | 'count' | 'sequence' | 'in' | 'click';
const NAMES: Name[] = ['loop', 'busy', 'morph', 'count', 'sequence', 'in', 'click'];

/** What the checks read: refs, completions by icon, readiness, presses of the target. */
export interface Scene {
    handles: Partial<Record<Name, LordIconHandle | null>>;
    completes: Record<Name, CompleteDetail[]>;
    ready: number;
    errors: number;
    presses: number;
    scroll: { scrollToEnd(options?: { animated?: boolean }): void } | null;
}

export function newScene(): Scene {
    const completes = Object.fromEntries(
        NAMES.map((name) => [name, []]),
    ) as unknown as Scene['completes'];
    return { handles: {}, completes, ready: 0, errors: 0, presses: 0, scroll: null };
}

export function TriggerScene(props: { values: SceneValues; scene: RefObject<Scene> }) {
    const { values, scene } = props;
    const icon = (name: Name) => ({
        ref: (handle: LordIconHandle | null) => {
            scene.current.handles[name] = handle;
        },
        size: 40,
        onReady: () => scene.current.ready++,
        onError: () => scene.current.errors++,
        onComplete: (detail: CompleteDetail) => scene.current.completes[name].push(detail),
    });
    // `always`: the checks are of the triggers' mechanics, also where the system asks for less
    // motion (CI's emulator turns animations off, which Android reports as such).
    return (
        <LordIconProvider motion="always">
            <ScrollView
                ref={(view) => {
                    scene.current.scroll = view;
                }}
                style={styles.scene}
            >
                <View style={styles.row}>
                    <LordIcon
                        {...icon('loop')}
                        icon={download}
                        state="loop-cycle"
                        trigger="loop(400)"
                    />
                    <LordIcon
                        {...icon('busy')}
                        icon={download}
                        state="loop-cycle"
                        value={values.busy}
                    />
                    <LordIcon
                        {...icon('morph')}
                        icon={morphSelect}
                        state="morph-select"
                        value={values.on}
                    />
                    <LordIcon
                        {...icon('count')}
                        icon={download}
                        state="in-reveal"
                        value={values.count}
                    />
                    <LordIcon
                        {...icon('sequence')}
                        icon={download}
                        trigger="sequence(play in-reveal, play hover-pinch, stop)"
                    />
                    <LordIcon.Target
                        accessibilityLabel="selftest-target"
                        onPress={() => scene.current.presses++}
                        style={styles.target}
                    >
                        <LordIcon {...icon('click')} icon={morphSelect} trigger="click" />
                        <Text>tap</Text>
                    </LordIcon.Target>
                </View>
                <View style={styles.spacer} />
                <LordIcon {...icon('in')} icon={lockAlt} state="in-reveal" trigger="in" />
            </ScrollView>
        </LordIconProvider>
    );
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Polls until `ok` or `ms` pass; then fails with what it waited for. */
async function until(ok: () => boolean, ms: number, what: string): Promise<void> {
    const start = Date.now();
    while (!ok()) {
        if (Date.now() - start > ms) throw new Error(`triggers: ${what}`);
        await sleep(30);
    }
}

/** The checks, once the scene is mounted. `set` changes the values the scene follows. */
export async function checkTriggers(
    scene: Scene,
    set: (values: Partial<SceneValues>) => void,
    say: (line: string) => void,
    tap: boolean,
): Promise<void> {
    await until(() => scene.ready === NAMES.length || scene.errors > 0, 20000, 'icons ready');
    if (scene.errors) throw new Error(`triggers: ${scene.errors} onError`);
    const handle = (name: Name) => scene.handles[name]!;

    // loop(400): the renderer rests on the last frame between rounds, then goes round again.
    const loop = handle('loop');
    const last = loop.segment[1] - 1;
    let restStart = 0;
    let rested = 0;
    await until(
        () => {
            const frame = loop.frame;
            if (frame === last && !restStart) restStart = Date.now();
            if (frame < last && restStart) {
                rested = Date.now() - restStart;
                restStart = 0;
            }
            return rested > 0;
        },
        6000,
        'loop(400) never rested and went on',
    );
    if (rested < 250 || rested > 900) throw new Error(`triggers: loop rested ${rested} ms`);
    if (scene.completes.loop.length) throw new Error('triggers: a loop round completed in JS');
    say(`triggers: loop(400) rests ${rested} ms in the renderer`);

    // value + loop-*: loops while true, ends its round after.
    set({ busy: true });
    await until(() => handle('busy').playing, 2000, 'busy: no loop');
    await sleep(1500);
    if (scene.completes.busy.length) {
        const busy = handle('busy');
        throw new Error(
            `triggers: busy completed while true: ${JSON.stringify(scene.completes.busy)}, ` +
                `loop ${busy.loop}, frame ${busy.frame}, segment ${busy.segment.join('-')}`,
        );
    }
    set({ busy: false });
    await until(() => scene.completes.busy.length === 1, 4000, 'busy: the round did not end');
    say('triggers: value loops while true, the round ends after');

    // value + morph-*: there on true, back on false.
    set({ on: true });
    await until(() => scene.completes.morph.length === 1, 4000, 'morph: did not go there');
    set({ on: false });
    await until(() => scene.completes.morph.length === 2, 4000, 'morph: did not come back');
    say('triggers: value morphs there and back');

    // value as a count: the entrance, then a nudge with the default state.
    set({ count: 1 });
    await until(() => scene.completes.count.length === 1, 4000, 'count: no entrance');
    set({ count: 2 });
    await until(() => scene.completes.count.length === 2, 4000, 'count: no nudge');
    const [entrance, nudge] = scene.completes.count.map((detail) => detail.state);
    if (entrance !== 'in-reveal' || nudge === 'in-reveal') {
        throw new Error(`triggers: count played ${entrance}, ${nudge}`);
    }
    say('triggers: value counts: entrance, then a nudge');

    // sequence: its steps in order, then stop.
    await until(() => scene.completes.sequence.length >= 2, 8000, 'sequence: steps missing');
    const steps = scene.completes.sequence.map((detail) => detail.state).join(', ');
    if (steps !== 'in-reveal, hover-pinch') throw new Error(`triggers: sequence played ${steps}`);
    say('triggers: sequence played its steps');

    // A real tap on the Target (Android, from e2e-android.sh).
    if (tap) {
        say('TAP selftest-target');
        await until(() => scene.presses > 0, 20000, 'tap: the target was not pressed');
        await until(() => scene.completes.click.length > 0, 4000, 'tap: click did not play');
        say('triggers: a tap on LordIcon.Target played click');
    } else {
        say('triggers: tap skipped (no tap from outside on this run)');
    }

    // in: nothing until it comes into view.
    await sleep(500);
    if (scene.completes.in.length) throw new Error('triggers: in played off screen');
    scene.scroll?.scrollToEnd({ animated: false });
    await until(() => scene.completes.in.length === 1, 5000, 'in: did not play in view');
    say('triggers: in played once in view');
}

const styles = StyleSheet.create({
    scene: { flex: 1 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 8, alignItems: 'center' },
    target: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 10,
        backgroundColor: '#eee',
    },
    spacer: { height: 2000 },
});

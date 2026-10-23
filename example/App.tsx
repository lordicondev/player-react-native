// Example app: the gallery (one topic per screen, as the README) and the developer part (the
// self-test CI runs, the list of 200 icons, the playground, the web bench).
import { useEffect } from 'react';
import { Linking, Platform, StatusBar } from 'react-native';
// Settings is iOS only: react-native-web has no such export, so not a named import.
import * as ReactNative from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CommonActions, NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import {
    createNativeStackNavigator,
    type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Bench } from './dev/Bench';
import { Developer } from './dev/Developer';
import { ICONS } from './dev/icons';
import { List } from './dev/List';
import { Playground } from './dev/Playground';
import { SelfTest } from './dev/SelfTest';
import { ExampleScreen, Gallery } from './gallery/Gallery';
import { EXAMPLES } from './gallery';

type Screens = {
    Gallery: undefined;
    Example: { id: string };
    Developer: undefined;
    SelfTest: undefined;
    SelfTestTap: undefined;
    List: undefined;
    Playground: undefined;
    Bench: undefined;
};

const Stack = createNativeStackNavigator<Screens>();

// Links open a screen: lordicon-example://examples/08, and for scripts and CI selftest,
// selftest-tap (the self-test with a tap from outside, e2e-android.sh), list, demo, bench. On iOS
// a launch argument instead (`simctl launch … -tab list`: iOS asks before opening links of other
// apps); on the web the path, or ?tab=list (web/main.tsx).
const linking: LinkingOptions<Screens> = {
    prefixes: ['lordicon-example://'],
    // lordicon-example://gc is no screen: a JS garbage collection (memory-android.sh).
    filter: (url) => !url.endsWith('://gc'),
    config: {
        initialRouteName: 'Gallery',
        screens: {
            Gallery: '',
            Example: 'examples/:id',
            Developer: 'developer',
            SelfTest: 'selftest',
            SelfTestTap: 'selftest-tap',
            List: 'list',
            Playground: 'demo',
            Bench: 'bench',
        },
    },
    // A link replaces the screens open (the gallery stays under it): the screen it left
    // unmounts, as memory-android.sh expects when it goes from the list to the playground.
    getActionFromState: (state) =>
        CommonActions.reset(state as Parameters<typeof CommonActions.reset>[0]),
    async getInitialURL() {
        const tab = Platform.OS === 'ios' ? ReactNative.Settings.get('tab') : null;
        return typeof tab === 'string' ? `lordicon-example://${tab}` : Linking.getInitialURL();
    },
};

/** Memory measurements: unmounted native views live until a JS garbage collection. */
function useGarbageCollectionLink() {
    useEffect(() => {
        const collect = (url: string | null) => {
            if (url === 'lordicon-example://gc') (globalThis as { gc?: () => void }).gc?.();
        };
        const subscription = Linking.addEventListener('url', (event) => collect(event.url));
        return () => subscription.remove();
    }, []);
}

export default function App() {
    useGarbageCollectionLink();
    return (
        <SafeAreaProvider>
            <StatusBar barStyle="dark-content" />
            <NavigationContainer linking={linking}>
                <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: '#fff' } }}>
                    <Stack.Screen name="Gallery" options={{ title: 'Lordicon' }}>
                        {({ navigation }: NativeStackScreenProps<Screens, 'Gallery'>) => (
                            <Gallery
                                open={(example) =>
                                    navigation.navigate('Example', { id: example.id })
                                }
                                openDeveloper={() => navigation.navigate('Developer')}
                            />
                        )}
                    </Stack.Screen>
                    <Stack.Screen
                        name="Example"
                        options={({ route }) => ({
                            title: EXAMPLES.find((e) => e.id === route.params.id)?.title ?? '',
                        })}
                    >
                        {({ route }: NativeStackScreenProps<Screens, 'Example'>) => (
                            <ExampleScreen id={route.params.id} />
                        )}
                    </Stack.Screen>
                    <Stack.Screen name="Developer">
                        {({ navigation }: NativeStackScreenProps<Screens, 'Developer'>) => (
                            <Developer open={(screen) => navigation.navigate(screen)} />
                        )}
                    </Stack.Screen>
                    <Stack.Screen name="SelfTest" options={{ title: 'Self-test' }}>
                        {() => <SelfTest icons={Object.values(ICONS)} />}
                    </Stack.Screen>
                    <Stack.Screen name="SelfTestTap" options={{ title: 'Self-test' }}>
                        {() => <SelfTest icons={Object.values(ICONS)} tap />}
                    </Stack.Screen>
                    <Stack.Screen name="List" component={List} options={{ title: 'List 200' }} />
                    <Stack.Screen name="Playground" component={Playground} />
                    <Stack.Screen name="Bench">{() => <Bench icons={ICONS} />}</Stack.Screen>
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

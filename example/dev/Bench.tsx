// The web bench (Bench.web.tsx) only: worker rendering is a web thing.
import { Text } from 'react-native';

export function Bench(_props: { icons: Record<string, object> }) {
    return <Text>The bench runs on the web.</Text>;
}

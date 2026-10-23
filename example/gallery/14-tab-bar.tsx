// README: "Tabs". In `tabBarIcon` of React Navigation (and `Tabs` of Expo Router): the tab's
// focus from `useTabFocus` is the value, in a small component, and the icon morphs when its tab
// is chosen and back when it is left. `color` and `size` come from the bar. On Android the tab's
// ripple would wash over the icon: a transparent one leaves the icon to answer the tap.
import { Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import {
    LordIcon,
    useTabFocus,
    type FocusSource,
    type LordIconProps,
} from '@lordicon/react-native';
import avatarCircle from '../icons/avatar-circle.json';
import cart from '../icons/cart.json';
import gridWidget from '../icons/grid-widget.json';
import magnifier from '../icons/magnifier.json';
import { colors } from './ui';

const ICONS: Record<string, object> = {
    Home: gridWidget,
    Search: magnifier,
    Cart: cart,
    Profile: avatarCircle,
};

const Tab = createBottomTabNavigator();

function TabIcon({ navigation, ...props }: LordIconProps & { navigation: FocusSource }) {
    return <LordIcon {...props} state="morph-select" value={useTabFocus(navigation)} />;
}

function Page(props: { title: string }) {
    return (
        <View style={styles.page}>
            <Text>{props.title}</Text>
        </View>
    );
}

export default function TabBar() {
    return (
        <Tab.Navigator
            screenOptions={({ route, navigation }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.brand,
                tabBarIcon: ({ color, size }) => (
                    <TabIcon
                        icon={ICONS[route.name]}
                        navigation={navigation}
                        color={color}
                        size={size}
                    />
                ),
                tabBarButton: (props) => <PlatformPressable {...props} pressColor="transparent" />,
            })}
        >
            {Object.keys(ICONS).map((name) => (
                <Tab.Screen key={name} name={name}>
                    {() => <Page title={name} />}
                </Tab.Screen>
            ))}
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

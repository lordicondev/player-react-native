// README: "On its own". `trigger="in"` plays the icon once, when half of it has scrolled into
// view. With an `in-*` state it waits hidden on the state's first frame, then enters.
import { StyleSheet, Text, View } from 'react-native';
import { LordIcon } from '@lordicon/react-native';
import bulb from '../icons/bulb.json';
import cog from '../icons/cog.json';
import folder from '../icons/folder.json';
import heart from '../icons/heart.json';
import link from '../icons/link.json';
import star from '../icons/star.json';
import { colors, ui } from './ui';

const FEATURES = [
    { icon: bulb, title: 'Ideas', text: 'Write them down before they go.' },
    { icon: folder, title: 'Folders', text: 'Keep notes together.' },
    { icon: link, title: 'Links', text: 'Share a note with a link.' },
    { icon: star, title: 'Favourites', text: 'Find the ones you need first.' },
    { icon: heart, title: 'Likes', text: 'See what others liked.' },
    { icon: cog, title: 'Settings', text: 'Make it yours.' },
];

export default function InView() {
    return (
        <View style={ui.page}>
            <Text style={styles.hint}>Scroll down: each icon enters as it comes into view.</Text>
            {FEATURES.map((feature) => (
                <View key={feature.title} style={styles.feature}>
                    <LordIcon icon={feature.icon} state="in-reveal" trigger="in" size={48} />
                    <View style={styles.text}>
                        <Text style={styles.title}>{feature.title}</Text>
                        <Text style={styles.body}>{feature.text}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    hint: { color: colors.inkSoft, paddingBottom: 120 },
    feature: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        minHeight: 140,
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.surfaceMuted,
    },
    text: { flex: 1, gap: 4 },
    title: { color: colors.ink, fontSize: 17, fontWeight: '600' },
    body: { color: colors.inkSoft },
});

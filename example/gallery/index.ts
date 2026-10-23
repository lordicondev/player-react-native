// The gallery: one topic per screen, in the order of the README. `readme` names the section
// that shows the same code; `fill`: the example takes the whole screen (it scrolls itself).
import type { ComponentType } from 'react';
import FirstIcon from './01-first-icon';
import States from './02-states';
import Looks from './03-looks';
import Intro from './04-intro';
import InView from './05-in-view';
import Loops from './06-loops';
import Sequence from './07-sequence';
import AnyButton from './08-any-button';
import OwnButton from './09-own-button';
import Toggle from './10-toggle';
import Busy from './11-busy';
import Count from './12-count';
import Stages from './13-stages';
import TabBar from './14-tab-bar';
import List from './15-list';
import SearchField from './16-search-field';
import Theme from './17-theme';
import RefAndEvents from './18-ref-and-events';
import CustomTrigger from './19-custom-trigger';
import Accessibility from './20-accessibility';
import ManyIcons from './21-many-icons';

export interface Example {
    id: string;
    title: string;
    description: string;
    readme: string;
    Screen: ComponentType;
    fill?: boolean;
}

export const SECTIONS: { title: string; data: Example[] }[] = [
    {
        title: 'Basics',
        data: [
            {
                id: '01',
                title: 'First icon',
                description: 'An icon, still, entering, looping',
                readme: 'Your first icon',
                Screen: FirstIcon,
            },
            {
                id: '02',
                title: 'States',
                description: 'The animations an icon holds',
                readme: 'Your first icon',
                Screen: States,
            },
            {
                id: '03',
                title: 'Colours and stroke',
                description: 'Colours, one colour, stroke, speed',
                readme: 'Colours and themes',
                Screen: Looks,
            },
        ],
    },
    {
        title: 'On its own',
        data: [
            {
                id: '04',
                title: 'Intro',
                description: 'intro: icons enter with their screen',
                readme: 'On its own',
                Screen: Intro,
            },
            {
                id: '05',
                title: 'In view',
                description: 'in: plays once scrolled into view',
                readme: 'On its own',
                Screen: InView,
            },
            {
                id: '06',
                title: 'Loops',
                description: 'loop, and a rest between rounds',
                readme: 'On its own',
                Screen: Loops,
            },
            {
                id: '07',
                title: 'Sequence',
                description: 'sequence: a script of states',
                readme: 'On its own',
                Screen: Sequence,
            },
        ],
    },
    {
        title: 'Taps',
        data: [
            {
                id: '08',
                title: 'Any button',
                description: 'play() from its onPress',
                readme: 'Taps',
                Screen: AnyButton,
            },
            {
                id: '09',
                title: 'Your own button',
                description: 'LordIcon.Target and the triggers',
                readme: 'Taps',
                Screen: OwnButton,
            },
        ],
    },
    {
        title: 'Following your app',
        data: [
            {
                id: '10',
                title: 'Toggle',
                description: 'value: on and off',
                readme: 'Following your app',
                Screen: Toggle,
            },
            {
                id: '11',
                title: 'Busy',
                description: 'value: loops while true',
                readme: 'Following your app',
                Screen: Busy,
            },
            {
                id: '12',
                title: 'Count',
                description: 'value: unread messages',
                readme: 'Following your app',
                Screen: Count,
            },
            {
                id: '13',
                title: 'Stages',
                description: 'value: a state per stage',
                readme: 'Following your app',
                Screen: Stages,
            },
        ],
    },
    {
        title: 'In an app',
        data: [
            {
                id: '14',
                title: 'Tab bar',
                description: 'tabBarIcon of React Navigation',
                readme: 'Tabs',
                Screen: TabBar,
                fill: true,
            },
            {
                id: '15',
                title: 'List',
                description: 'FlashList and recyclingKey',
                readme: 'Lists',
                Screen: List,
                fill: true,
            },
            {
                id: '16',
                title: 'Search field',
                description: 'value: focus and text',
                readme: 'Following your app',
                Screen: SearchField,
            },
            {
                id: '17',
                title: 'Theme',
                description: 'LordIconProvider, light and dark',
                readme: 'Colours and themes',
                Screen: Theme,
            },
        ],
    },
    {
        title: 'Further',
        data: [
            {
                id: '18',
                title: 'Ref and events',
                description: 'play() promises, onComplete',
                readme: 'The ref and events',
                Screen: RefAndEvents,
            },
            {
                id: '19',
                title: 'Custom trigger',
                description: 'BaseTrigger and defineTrigger',
                readme: 'Custom triggers',
                Screen: CustomTrigger,
            },
            {
                id: '20',
                title: 'Accessibility',
                description: 'Labels and less motion',
                readme: 'Accessibility and less motion',
                Screen: Accessibility,
            },
            {
                id: '21',
                title: 'Many icons',
                description: 'Render threads and frame rate',
                readme: 'Performance',
                Screen: ManyIcons,
                fill: true,
            },
        ],
    },
];

export const EXAMPLES: Example[] = SECTIONS.flatMap((section) => section.data);

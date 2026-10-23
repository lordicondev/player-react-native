// The example app in the browser: react-native-web, the library's LordIcon.web.tsx. ?tab=list
// (or selftest, bench…) opens that screen, as a path (/list), keeping the other parameters.
import { AppRegistry } from 'react-native';
import App from '../App';

const query = new URLSearchParams(location.search);
const tab = query.get('tab');
if (tab) {
    query.delete('tab');
    const rest = query.toString();
    history.replaceState(null, '', `/${tab}${rest ? `?${rest}` : ''}`);
}

AppRegistry.registerComponent('LordIconExample', () => App);
AppRegistry.runApplication('LordIconExample', { rootTag: document.getElementById('root') });

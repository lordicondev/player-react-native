// A web app with react-native-web (Vite or webpack), no React Native toolchain.
import { AppRegistry } from 'react-native';
import App from '../App';

AppRegistry.registerComponent('Consumer', () => App);
AppRegistry.runApplication('Consumer', { rootTag: document.getElementById('root') });

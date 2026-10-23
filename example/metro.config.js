// The library comes from the parent directory, as source. Its own node_modules has React and
// React Native for development: those are blocked, so there is one copy of each, the app's.
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');
const escape = (p) => p.replace(/[/\\]/g, '[/\\\\]').replace(/\./g, '\\.');
const shared = Object.keys(pkg.peerDependencies);

module.exports = mergeConfig(getDefaultConfig(__dirname), {
    watchFolders: [root],
    resolver: {
        blockList: shared.map(
            (name) => new RegExp(`^${escape(path.join(root, 'node_modules', name))}[/\\\\]`),
        ),
        extraNodeModules: {
            [pkg.name]: root,
            ...Object.fromEntries(
                shared.map((name) => [name, path.join(__dirname, 'node_modules', name)]),
            ),
        },
    },
});

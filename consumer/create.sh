#!/usr/bin/env bash
# Makes an app the way a user would, with @lordicon/react-native and @lordicon/runtime from
# `npm pack` (not from source), and the check screen (App.tsx):
#   ./create.sh expo <dir>      Expo (EXPO_TEMPLATE, default@latest by default), web with
#                               lordicon-assets in postinstall; android/ from `expo prebuild`
#   ./create.sh rn <dir>        React Native CLI (RN_VERSION, the oldest supported by default)
#   ./create.sh vite <dir>      a web app: Vite with react-native-web
#   ./create.sh webpack <dir>   a web app: webpack with react-native-web
# PACKS: a directory with both packages already packed (CI); otherwise the library is packed here
# and the runtime comes from npm, the version in package-lock.json, or from RUNTIME, a built
# clone of player-runtime (dist/ in place) to try changes not yet published.
# PREBUILD: the platform `expo prebuild` makes (android by default, ios on macOS; none).
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
flavour=${1:?expo, rn, vite or webpack}
dir=${2:?the directory to make}
runtime=${RUNTIME:-}
RN_VERSION=${RN_VERSION:-0.82.1}
EXPO_TEMPLATE=${EXPO_TEMPLATE:-default@latest}

PREBUILD=${PREBUILD:-$([ "$(uname)" = Darwin ] && echo ios || echo android)}
[ -e "$dir" ] && { echo "$dir exists"; exit 1; }
mkdir -p "$(dirname "$dir")"
dir=$(cd "$(dirname "$dir")" && pwd)/$(basename "$dir")

packs=$(mktemp -d)
if [ -n "${PACKS:-}" ]; then
    cp "$PACKS"/lordicon-runtime-*.tgz "$PACKS"/lordicon-react-native-*.tgz "$packs/"
else
    if [ -n "$runtime" ]; then
        [ -f "$runtime/dist/index.js" ] || { echo "no $runtime/dist: build player-runtime first"; exit 1; }
        (cd "$runtime" && npm pack --silent --pack-destination "$packs" >/dev/null)
    else
        version=$(cd "$here/.." && node -p "require('./package-lock.json').packages['node_modules/@lordicon/runtime'].version")
        npm pack --silent "@lordicon/runtime@$version" --pack-destination "$packs" >/dev/null
    fi
    (cd "$here/.." && npm pack --silent --pack-destination "$packs" >/dev/null)
fi

case $flavour in
expo)
    # Named consumer whatever the directory (an app named expo would clash with the package).
    made=$(mktemp -d)
    npx --yes create-expo-app@latest "$made/consumer" --template "$EXPO_TEMPLATE" --yes --no-install
    mv "$made/consumer" "$dir" && rm -rf "$made"
    rm -rf "$dir/.git" "$dir/src/app" "$dir/app"
    mkdir -p "$dir/src/app"
    printf "import { Slot } from 'expo-router';\n\nexport default function Layout() {\n    return <Slot />;\n}\n" >"$dir/src/app/_layout.tsx"
    printf "export { default } from '../consumer/App';\n" >"$dir/src/app/index.tsx"
    app="$dir/src/consumer"
    assets="'/lordicon/'"
    ;;
rn)
    npx --yes @react-native-community/cli@latest init Consumer --version "$RN_VERSION" \
        --directory "$dir" --package-name com.lordicon.consumer --skip-install --skip-git-init \
        --install-pods false
    app="$dir"
    assets=undefined
    ;;
vite | webpack)
    mkdir -p "$dir/web"
    cp "$here/web/index.html" "$here/web/main.tsx" "$dir/web/"
    if [ "$flavour" = vite ]; then
        cp "$here/web/vite.config.mjs" "$dir/"
        dev='"vite": "^8.0.0", "@vitejs/plugin-react": "^6.0.0"'
        build='vite build web --config vite.config.mjs --outDir ../dist --emptyOutDir'
    else
        cp "$here/web/webpack.config.cjs" "$dir/"
        dev='"webpack": "^5.0.0", "webpack-cli": "^6.0.0", "html-webpack-plugin": "^5.0.0", "babel-loader": "^10.0.0", "@babel/core": "^7.0.0", "@babel/preset-react": "^7.0.0", "@babel/preset-typescript": "^7.0.0"'
        build='webpack --config webpack.config.cjs'
    fi
    cat >"$dir/package.json" <<JSON
{
    "name": "consumer-$flavour",
    "private": true,
    "type": "module",
    "scripts": { "build": "$build" },
    "dependencies": { "react": "^19.2.0", "react-dom": "^19.2.0", "react-native-web": "^0.21.0" },
    "devDependencies": { $dev }
}
JSON
    sed -i.bak 's#\.\./App#../src/App#' "$dir/web/main.tsx" && rm "$dir/web/main.tsx.bak"
    app="$dir/src"
    assets=undefined
    ;;
*)
    echo "unknown: $flavour"
    exit 1
    ;;
esac

mkdir -p "$app/icons"
cp "$here/App.tsx" "$app/App.tsx"
cp "$here/../example/icons/download.json" "$here/../example/icons/dev/morph-select.json" "$app/icons/"
printf "// Where the web build's files are: '/lordicon/' where lordicon-assets copied them.\nexport const assets: string | undefined = %s;\n" "$assets" >"$app/consumer-config.ts"

mkdir -p "$dir/vendor"
cp "$packs"/*.tgz "$dir/vendor/"
rm -rf "$packs"
cd "$dir"
# The packages as files; the runtime the library asks for is the packed one too.
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
const runtime = fs.readdirSync("vendor").find((f) => f.startsWith("lordicon-runtime-"));
const library = fs.readdirSync("vendor").find((f) => f.startsWith("lordicon-react-native-"));
p.dependencies["@lordicon/runtime"] = `file:vendor/${runtime}`;
p.dependencies["@lordicon/react-native"] = `file:vendor/${library}`;
p.overrides = { ...p.overrides, "@lordicon/runtime": "$@lordicon/runtime" };
if (process.argv[1] === "expo") {
    p.scripts = { ...p.scripts, postinstall: "lordicon-assets public/lordicon" };
    const app = JSON.parse(fs.readFileSync("app.json", "utf8"));
    app.expo.android = { ...app.expo.android, package: "com.lordicon.consumer" };
    app.expo.ios = { ...app.expo.ios, bundleIdentifier: "com.lordicon.consumer" };
    fs.writeFileSync("app.json", JSON.stringify(app, null, 2) + "\n");
}
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
' "$flavour"
npm install --no-audit --no-fund
if [ "$flavour" = expo ] && [ "$PREBUILD" != none ]; then
    CI=1 npx expo prebuild --no-install --platform "$PREBUILD"
fi
echo "consumer: $flavour app in $dir"

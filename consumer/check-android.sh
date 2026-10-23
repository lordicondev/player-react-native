#!/usr/bin/env bash
# Installs a consumer app's APK on the device or emulator, starts it and waits for
# `LORDICON_CONSUMER PASS` in the log; fails on FAIL, a crash or no result in 90 s.
# Usage: ./check-android.sh <apk>
set -euo pipefail
apk=${1:?the APK}
PKG=com.lordicon.consumer
adb install -r "$apk" >/dev/null
adb logcat -c
adb shell monkey -p $PKG 1 >/dev/null 2>&1
for _ in $(seq 1 90); do
    log=$(adb logcat -d -s ReactNativeJS:V AndroidRuntime:E)
    if line=$(grep -o 'LORDICON_CONSUMER .*' <<<"$log" | tail -1) && [ -n "$line" ]; then
        echo "consumer android: ${line#LORDICON_CONSUMER }"
        [[ $line == *PASS* ]] && exit 0 || exit 1
    fi
    if grep -q 'FATAL EXCEPTION' <<<"$log"; then
        echo "consumer android: crashed"
        grep -A20 'FATAL EXCEPTION' <<<"$log" | head -30
        exit 1
    fi
    sleep 1
done
echo "consumer android: no result in 90 s"
exit 1

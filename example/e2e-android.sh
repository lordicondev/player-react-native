#!/usr/bin/env bash
# End-to-end test on a device or emulator with the example app installed: runs the self-test
# (lordicon-example://selftest-tap, SelfTest.tsx) and fails when it does not pass, when the app
# crashes, or when Fabric drops a view command. The self-test asks for a tap on a view
# (`LORDICON_SELFTEST TAP <label>`): this script finds it by its accessibility label and taps it.
# Saves the log and a screenshot.
# Usage: ./e2e-android.sh [out-dir]     default: e2e-out
set -uo pipefail
PKG=com.lordicon.example
OUT=${1:-e2e-out}
mkdir -p "$OUT"

# One run of the self-test: its result line, or nothing in 180 s.
run() {
    adb shell am force-stop $PKG
    adb logcat -c
    # A new task (NEW_TASK | CLEAR_TASK): the system may restart the app's task from its first
    # intent, which then is this one, not an older link.
    adb shell am start -W -f 0x10008000 -a android.intent.action.VIEW -d lordicon-example://selftest-tap $PKG >/dev/null
    result=""
    tapped=""
    for _ in $(seq 1 180); do
        sleep 1
        log=$(adb logcat -d -s ReactNativeJS:I)
        result=$(grep -o 'LORDICON_SELFTEST \(PASS\|FAIL\).*' <<<"$log" | head -1)
        [ -n "$result" ] && break
        label=$(grep -o 'LORDICON_SELFTEST TAP [a-z-]*' <<<"$log" | head -1 | awk '{print $3}')
        if [ -n "$label" ] && [ -z "$tapped" ]; then
            tap "$label" && tapped=1
        fi
    done
}

# Taps the view with the accessibility label (content-desc) at its centre.
tap() {
    adb shell uiautomator dump /sdcard/selftest-ui.xml >/dev/null
    bounds=$(adb shell cat /sdcard/selftest-ui.xml | tr '>' '\n' | grep "content-desc=\"$1\"" |
        grep -o 'bounds="[^"]*"' | head -1 | tr -dc '0-9,[]' | tr '][' ' ,')
    read -r x1 y1 x2 y2 <<<"$(tr ',' ' ' <<<"$bounds")"
    if [ -z "${y2:-}" ]; then
        echo "e2e: no view labelled $1 to tap"
        return 1
    fi
    adb shell input tap $(((x1 + x2) / 2)) $(((y1 + y2) / 2))
    echo "e2e: tapped $1"
}

in_front() {
    adb shell dumpsys activity activities | grep -m1 topResumedActivity | grep -q $PKG
}

# A freshly booted emulator (CI) keeps its CPUs busy for a while (SystemUI, Google services):
# timings measured then are the system's. Wait until the device is idle: CPU below 40% three
# samples in a row, at most 3 minutes.
cpu() {  # busy and total jiffies
    adb shell cat /proc/stat | awk '/^cpu /{print $2+$3+$4+$7+$8, $2+$3+$4+$5+$6+$7+$8}'
}
settle() {
    local start=$SECONDS quiet=0
    read -r b0 t0 <<<"$(cpu)"
    while [ $quiet -lt 3 ] && [ $((SECONDS - start)) -lt 180 ]; do
        sleep 2
        read -r b1 t1 <<<"$(cpu)"
        busy=$(( (b1 - b0) * 100 / (t1 - t0 > 0 ? t1 - t0 : 1) ))
        if [ $busy -lt 40 ]; then quiet=$((quiet + 1)); else quiet=0; fi
        b0=$b1; t0=$t1
    done
    echo "e2e: device idle after $((SECONDS - start)) s (CPU $busy%)"
}

settle
run
# The system sometimes starts the app's task a second time, just after a launch (seen on a
# Pixel, after an install), and leaves it paused: nothing mounts. Not the library's failure:
# run once more.
if [[ "$result" != *PASS* ]] && ! in_front; then
    echo "e2e: the app was not in front (${result:-no result}); running again"
    run
fi

adb exec-out screencap -p >"$OUT/selftest.png"
adb logcat -d >"$OUT/logcat.txt"
grep -o 'LORDICON_SELFTEST .*' "$OUT/logcat.txt"

status=0
case "$result" in
    *PASS*) ;;
    "") echo "e2e: no result from the self-test in 180 s"; status=1 ;;
    *) status=1 ;;
esac
pid=$(adb shell pidof $PKG | tr -d '\r')
if grep -q "FATAL EXCEPTION\|Fatal signal" "$OUT/logcat.txt"; then
    echo "e2e: the app crashed"
    status=1
fi
if grep -q "Unable to find viewState for tag [0-9]* for commandId" "$OUT/logcat.txt"; then
    echo "e2e: Fabric dropped view commands"
    status=1
fi
[ -z "$pid" ] && { echo "e2e: the app is not running"; status=1; }
[ $status -eq 0 ] && echo "e2e: passed" || echo "e2e: FAILED (log and screenshot in $OUT)"
exit $status

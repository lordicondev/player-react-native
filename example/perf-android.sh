#!/usr/bin/env bash
# The list test on a device or emulator: for each size, render mode and number of animating
# icons, the frame clock's timings (logcat LordIconTicker) and frame stats (dumpsys gfxinfo),
# at rest and while scrolling. Taps find the buttons by their text (uiautomator).
# Usage: ./perf-android.sh [counts...]     default: 50 200
set -euo pipefail
PKG=com.lordicon.example
COUNTS=("${@:-50 200}")
COUNTS=(${COUNTS[@]})
declare -A MODE=([ui]="ui" [background]="background" [pool]="pool 3")

# Taps the view with this text at its centre.
tap() {
    adb shell uiautomator dump /sdcard/perf-ui.xml >/dev/null
    local bounds
    bounds=$(adb shell cat /sdcard/perf-ui.xml | tr '>' '\n' | grep "text=\"$1\"" | head -1 |
        grep -oE 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' | grep -oE '[0-9]+' | tr '\n' ' ')
    [ -n "$bounds" ] || { echo "no button \"$1\"" >&2; exit 1; }
    set -- $bounds
    adb shell input tap $((($1 + $3) / 2)) $((($2 + $4) / 2))
    sleep 1.5
}
ticker() { adb logcat -d -s LordIconTicker | grep -o 'views=.*' | tail -1; }
frames() {
    adb shell dumpsys gfxinfo $PKG | grep -E "Total frames rendered|Janky frames:|50th percentile|90th percentile|99th percentile" \
        | grep -v GPU | sed 's/^ *//; s/Total frames rendered: /frames /; s/Janky frames: /janky /; s/th percentile: /: /' | tr '\n' ' '
}
measure() {  # label
    adb logcat -c
    adb shell dumpsys gfxinfo $PKG reset >/dev/null
    sleep 6
    echo "$1 rest:   $(frames)| $(ticker)"
    adb logcat -c
    adb shell dumpsys gfxinfo $PKG reset >/dev/null
    for _ in 1 2 3; do adb shell input swipe 540 2000 540 700 300; adb shell input swipe 540 700 540 2000 300; done
    echo "$1 scroll: $(frames)| $(ticker)"
}

adb shell setprop log.tag.LordIconTicker DEBUG
adb shell svc power stayon usb
adb shell am force-stop $PKG
adb shell am start -W -a android.intent.action.VIEW -d lordicon-example://list $PKG >/dev/null
sleep 3
for size in 48 96; do
    tap "$size dp"
    for mode in ui background pool; do
        tap "${MODE[$mode]}"
        for n in "${COUNTS[@]}"; do
            tap "$n anim"
            sleep 1
            measure "${size}dp $mode anim=$n"
        done
    done
done
adb shell dumpsys meminfo $PKG | awk '/Native Heap/ && !d {print "native heap KB", $3; d=1}'

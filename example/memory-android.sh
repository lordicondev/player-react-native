#!/usr/bin/env bash
# Memory of the list test on a device or emulator: native heap (allocated and PSS) and Java heap
# on the Demo tab, with the list of 200 icons (48 dp, background), and over list/Demo cycles. With
# `gc`, a JS garbage collection before each reading (lordicon-example://gc): unmounted native
# views live until it.
# Usage: ./memory-android.sh [cycles] [gc|nogc]     default: 5 gc
set -euo pipefail
PKG=com.lordicon.example
CYCLES=${1:-5}
GC=${2:-gc}

open() { adb shell am start -W -a android.intent.action.VIEW -d "lordicon-example://$1" $PKG >/dev/null; }
reading() {  # label
    if [ "$GC" = gc ]; then
        open gc
        sleep 2
    fi
    adb shell dumpsys meminfo $PKG | awk -v label="$1" '
        /Native Heap/ && !n { native_pss = $3; native_alloc = $(NF-1); n = 1 }
        /Dalvik Heap/ && !d { java_alloc = $(NF-1); d = 1 }
        /TOTAL PSS:/ { total = $3 }
        END { printf "%-10s native alloc %4d MB  native pss %4d MB  java alloc %3d MB  total pss %4d MB\n",
              label, native_alloc / 1024, native_pss / 1024, java_alloc / 1024, total / 1024 }'
}

adb shell svc power stayon usb
adb shell am force-stop $PKG
adb shell am start -W -a android.intent.action.VIEW -d lordicon-example://demo $PKG >/dev/null
sleep 4
reading "demo"
for i in $(seq 1 "$CYCLES"); do
    open list
    sleep 6
    reading "list $i"
    open demo
    sleep 3
    reading "demo $i"
done

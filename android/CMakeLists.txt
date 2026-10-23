# liblordicon_jni.so: the JNI bridge, the icon registry and models (../cpp) and the runtime's core with ThorVG, from the CMake project
# of @lordicon/runtime (LORDICON_RUNTIME, set by build.gradle).
cmake_minimum_required(VERSION 3.22)
project(lordicon_react_native CXX)

add_subdirectory(${LORDICON_RUNTIME} runtime)

add_library(lordicon_jni SHARED src/main/cpp/jni.cpp ../cpp/registry.cpp ../cpp/views.cpp ../cpp/models.cpp)
target_include_directories(lordicon_jni PRIVATE ../cpp)
# -Os in every build, also debug builds of the app: on a Pixel 8 as fast as -O2, 42 KB smaller
# (docs: m2-native.md). Target options come after the configuration's -O flags and win.
foreach(target thorvg lordicon_core lordicon_jni)
    target_compile_options(${target} PRIVATE -Os)
endforeach()
target_link_libraries(lordicon_jni PRIVATE lordicon_core jnigraphics log)
target_link_options(lordicon_jni PRIVATE -Wl,--gc-sections -Wl,--exclude-libs,ALL)

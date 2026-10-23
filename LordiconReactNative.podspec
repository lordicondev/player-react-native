require "json"
require "fileutils"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# The runtime's native sources come from @lordicon/runtime (core/ and ThorVG, already patched),
# found as Node finds it from here. CocoaPods compiles only files inside the pod's directory,
# so they are copied into ios/runtime on every `pod install`.
runtime = Pod::Executable.execute_command("node", ["--print",
  "require('path').dirname(require.resolve('@lordicon/runtime/package.json', { paths: [process.argv[1]] }))",
  __dir__]).strip
unless File.exist?(File.join(runtime, "thorvg-src", "inc", "thorvg.h"))
  raise "@lordicon/runtime at #{runtime} has no thorvg-src/: in a clone of player-runtime, run `npm run vendor:thorvg`"
end
vendored = File.join(__dir__, "ios", "runtime")
FileUtils.rm_rf(vendored)
FileUtils.mkdir_p(vendored)
FileUtils.cp_r([File.join(runtime, "core"), File.join(runtime, "thorvg-src")], vendored)

Pod::Spec.new do |s|
  s.name         = "LordiconReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => package["repository"]["url"].delete_prefix("git+"), :tag => s.version.to_s }

  # The same files as @lordicon/runtime's CMakeLists.txt: ThorVG's CPU engine, Lottie and raw
  # loaders, and the core.
  tvg = "ios/runtime/thorvg-src"
  s.source_files = [
    "ios/*.{h,mm}",
    "cpp/*.{h,cpp}",
    "ios/runtime/core/*.{h,cpp}",
    "ios/runtime/core/thorvg/config.h",
    "#{tvg}/inc/*.h",
    "#{tvg}/src/common/*.{h,cpp}",
    "#{tvg}/src/renderer/*.{h,cpp}",
    "#{tvg}/src/renderer/cpu_engine/*.{h,cpp}",
    "#{tvg}/src/loaders/lottie/*.{h,cpp}",
    "#{tvg}/src/loaders/raw/*.{h,cpp}",
  ]
  s.public_header_files = "ios/LordIconView.h"
  s.preserve_paths = "#{tvg}/src/loaders/lottie/rapidjson/**/*"

  search_paths = [
    "cpp", "ios/runtime/core", "ios/runtime/core/thorvg", "#{tvg}/inc", "#{tvg}/src/common",
    "#{tvg}/src/renderer", "#{tvg}/src/renderer/cpu_engine", "#{tvg}/src/loaders/lottie",
    "#{tvg}/src/loaders/raw",
  ].map { |path| "\"$(PODS_TARGET_SRCROOT)/#{path}\"" }.join(" ")
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => search_paths,
    "GCC_PREPROCESSOR_DEFINITIONS" => "$(inherited) TVG_STATIC=1",
    # ThorVG's own headers are found through the search paths, not the pod's header map, where
    # names like config.h could meet another pod's.
    "USE_HEADERMAP" => "NO",
    "GCC_OPTIMIZATION_LEVEL" => "s",
  }

  install_modules_dependencies(s)
end

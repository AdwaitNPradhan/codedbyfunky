# Credits

## 3D models

| Model | Author | License | Source | Used in |
|---|---|---|---|---|
| Arduino Uno | M Ferrieu | Creative Commons Attribution (CC BY), as listed on Poly Pizza | https://poly.pizza/m/2BEJQybmqQT | FunkyOS 3D hardware viewer (`public/models/arduino-uno-v1.glb`) |

Changes made to the model: converted and compressed with glTF-Transform (`optimize --compress meshopt --texture-compress webp --simplify false`). The mesh shape is unchanged. The file is loaded with `useGLTF(url, false, true)`: meshopt decoding only, no Draco, no KTX2.

The credit is also shown inside the 3D viewer window.

## Real Linux in the browser (FunkyOS "Linux.app")

The Linux app runs a real Linux kernel and shell inside the visitor's browser, with no network. Nothing is sent to a server. The files are in `public/linux/` and load only when the app starts.

| Part | License | Source (and source code offer) | File |
|---|---|---|---|
| v86 x86 emulator, version 0.5.473 (`libv86.js`, `v86.wasm`, `v86-fallback.wasm`) | BSD 2-Clause. Copyright (c) 2012, The v86 contributors. | https://github.com/copy/v86 and https://www.npmjs.com/package/v86 | `libv86-v1.js`, `v1-v86.wasm`, `v1-v86-fallback.wasm` |
| SeaBIOS and the SeaVGABIOS (VGA BIOS), as built for v86 | GNU LGPL version 3 | SeaBIOS: https://www.seabios.org/ and https://git.seabios.org/. Build files for these exact binaries: https://github.com/copy/v86/tree/master/bios (see `COPYING.LESSER`, `seabios.config`, `fetch-and-build-seabios.sh`). | `seabios-v1.bin`, `vgabios-v1.bin` |
| Linux kernel 6.8.12 with a Buildroot root file system (`buildroot-bzimage68.bin`, built for v86) | The kernel is GNU GPL version 2. The Buildroot user space has many licenses (BusyBox is GPL version 2, for example). | Kernel source: https://www.kernel.org/ and https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.8.12.tar.xz. Buildroot: https://buildroot.org/ (source: https://buildroot.org/downloads/). This image is the Buildroot image that the v86 project publishes (https://copy.sh/v86/?profile=buildroot, file https://i.copy.sh/buildroot-bzimage68.bin). The exact build settings of that image are not published in the v86 repository, so use kernel.org and buildroot.org for the source of the kernel and the packages, or ask the v86 project (https://github.com/copy/v86/issues). | `buildroot-v1.bin` |

GPL source offer: the complete corresponding source of the GPL and LGPL parts is available from the links above. If a link stops working, ask for the source and it will be sent on request (see the contact link on the site).

The files are used without changes. The v86 files come from the npm package `v86@0.5.473`; the BIOS files from the `copy/v86` repository; the kernel image from i.copy.sh.

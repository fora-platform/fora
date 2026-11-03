// lazLoader.js — decompress a LAZ file into plain LAS bytes in the browser.
//
// Design choice: this module does NOT parse points itself. It hands the LAZ to
// laz-perf (a WebAssembly build of the LASzip decompressor), reads the points
// back out, and rebuilds a valid uncompressed LAS buffer. That buffer then goes
// straight into the existing parseLAS — which stays completely untouched.
//
//   .laz file  ─▶  lazToLas()  ─▶  plain LAS ArrayBuffer  ─▶  parseLAS()  (unchanged)
//
// So adding LAZ support is one branch at the upload step:
//
//   let arrayBuffer = await file.arrayBuffer();
//   if (isLaz(file.name, arrayBuffer)) {
//     arrayBuffer = (await lazToLas(arrayBuffer)).buffer;
//   }
//   const parsed = parseLAS(arrayBuffer);          // exactly as before
//
// Dependency: laz-perf (npm i laz-perf). It ships one .wasm file that loads once
// and runs client-side — no server, consistent with FORA.
//
// Bundlers: laz-perf's web build looks for laz-perf.wasm next to its own script,
// which is not where Vite puts it. Import the .wasm as a URL and pass locateFile:
//   import lazWasmUrl from "laz-perf/lib/web/laz-perf.wasm?url";
//   makeLazToLas(() => createLazPerf({ locateFile: (p) => p.endsWith(".wasm") ? lazWasmUrl : p }));
//
// createLazPerf is passed in so this module has no hard import; you wire it up
// once at the app entry point:
//
//   import { createLazPerf } from "laz-perf";
//   import { makeLazToLas } from "./lazLoader.js";
//   const lazToLas = makeLazToLas(() => createLazPerf({ locateFile }));  // see "Bundlers"

// Quick check: is this a LAZ rather than a LAS?
// The LAS point-format byte (offset 104) has its top bit set when the file is
// LAZ-compressed; the file extension is the everyday signal.
export function isLaz(name, arrayBuffer) {
  if (name && /\.laz$/i.test(name)) return true;
  if (arrayBuffer) {
    const dv = new DataView(arrayBuffer);
    if (dv.byteLength > 105) {
      const sig = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
      if (sig === "LASF" && (dv.getUint8(104) & 0x80) !== 0) return true;
    }
  }
  return false;
}

// Build a lazToLas(arrayBuffer, opts) function bound to a laz-perf factory.
// The WASM module is created once on first use and reused after that.
//
// opts.maxPoints (default 5e6) mirrors parseLAS: parseLAS keeps every step-th
// point when a file has more than 5 M points. Doing the same thinning here, while
// decompressing, means a 50 M-point LAZ never has to exist as a 1.5 GB plain-LAS
// buffer in memory — and the kept points are exactly the ones parseLAS would have
// kept from the equivalent LAS file, so both paths give identical results.
//
// Returns { buffer, originalCount }: buffer is a valid uncompressed LAS holding
// the kept points; originalCount is the file's true point count (for the UI).
export function makeLazToLas(createLazPerf) {
  let modulePromise = null;
  const getModule = () => (modulePromise ||= createLazPerf());

  return async function lazToLas(lazArrayBuffer, opts = {}) {
    const maxPoints = opts.maxPoints ?? 5e6;
    const laz = new Uint8Array(lazArrayBuffer);
    const dv = new DataView(lazArrayBuffer);

    if (dv.byteLength < 227 ||
        String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== "LASF") {
      throw new Error("Not a LAS/LAZ file (missing LASF signature).");
    }

    const headerSize = dv.getUint16(94, true);
    const offsetToPointData = dv.getUint32(96, true);
    const pointFormat = dv.getUint8(104) & 0x3f;   // strip the LAZ compression bits
    const versionMinor = dv.getUint8(25);

    // --- decompress with laz-perf ---
    const Module = await getModule();
    const zipPtr = Module._malloc(laz.byteLength);
    if (!zipPtr) throw new Error("Not enough memory to open this LAZ file.");
    Module.HEAPU8.set(laz, zipPtr);

    const zip = new Module.LASZip();
    try {
      zip.open(zipPtr, laz.byteLength);
      const n = zip.getCount();
      const recLen = zip.getPointLength();
      if (!n) throw new Error("LAZ header reports zero points.");

      const step = n > maxPoints ? Math.ceil(n / maxPoints) : 1;
      const kept = Math.ceil(n / step);

      // plain LAS = original header + VLRs (scale, offset, CRS VLRs, everything
      // parseLAS relies on), then the raw point records
      const out = new Uint8Array(offsetToPointData + kept * recLen);
      out.set(laz.subarray(0, offsetToPointData), 0);
      const o = new DataView(out.buffer);
      out[104] = pointFormat;                 // uncompressed point format
      o.setUint16(105, recLen, true);         // record length as decoded
      o.setUint32(107, kept, true);           // legacy point count
      if (versionMinor >= 4 && headerSize >= 375) {
        o.setBigUint64(247, BigInt(kept), true);  // 64-bit point count
        o.setBigUint64(235, 0n, true);            // no EVLRs carried over
        o.setUint32(243, 0, true);
      }

      // LAZ must be decoded sequentially; every point is decoded, every step-th kept
      const pointPtr = Module._malloc(recLen);
      try {
        let w = offsetToPointData;
        for (let i = 0; i < n; i++) {
          zip.getPoint(pointPtr);
          if (i % step === 0) {
            out.set(Module.HEAPU8.subarray(pointPtr, pointPtr + recLen), w);
            w += recLen;
          }
        }
      } finally {
        Module._free(pointPtr);
      }
      return { buffer: out.buffer, originalCount: n };
    } finally {
      zip.delete();
      Module._free(zipPtr);
    }
  };
}

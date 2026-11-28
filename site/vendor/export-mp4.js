/* PRV · esportazione video in MP4 standard (H.264), fotogramma per fotogramma.
   Produce un file normale (non frammentato, indice all'inizio, con traccia audio silenziosa) che telefoni e app leggono con la durata giusta.
   Usa WebCodecs (Chrome, Edge, Safari 16.4+, Firefox 130+) e mp4-muxer (MIT, vendor/mp4-muxer.js). */
"use strict";
window.PRVExport = {
  supported() { return typeof window.VideoEncoder === "function" && typeof window.VideoFrame === "function" && typeof window.Mp4Muxer === "object"; },
  /* draw(ctx, t): disegna il fotogramma al tempo t (secondi). Restituisce un Blob MP4. */
  async mp4({ width = 1080, height = 1920, duration, fps = 30, draw, onProgress = () => {}, bitrate = 12_000_000 }) {
    const codecs = ["avc1.640028", "avc1.4d0028", "avc1.42002a", "avc1.420028"];
    let codec = null;
    for (const c of codecs) { try { const s = await VideoEncoder.isConfigSupported({ codec: c, width, height, bitrate, framerate: fps }); if (s.supported) { codec = c; break; } } catch {} }
    if (!codec) throw new Error("Il browser non sa codificare H.264");
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width, height, frameRate: fps },
      audio: { codec: "aac", numberOfChannels: 2, sampleRate: 48000 }, fastStart: "in-memory", firstTimestampBehavior: "offset" });
    let err = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (err = e) });
    enc.configure({ codec, width, height, bitrate, framerate: fps, avc: { format: "avc" } });
    const cv = document.createElement("canvas"); cv.width = width; cv.height = height;
    const ctx = cv.getContext("2d");
    const n = Math.round(duration * fps), us = 1e6 / fps;
    for (let i = 0; i < n; i++) {
      if (err) throw err;
      draw(ctx, Math.min(i / fps, duration - .001));
      const f = new VideoFrame(cv, { timestamp: Math.round(i * us), duration: Math.round(us) });
      enc.encode(f, { keyFrame: i % (fps * 2) === 0 }); f.close();
      if (enc.encodeQueueSize > 8) await new Promise((r) => { const w = () => (enc.encodeQueueSize > 4 ? setTimeout(w, 1) : r()); w(); });
      if (i % 10 === 0) { onProgress(i / n); await new Promise((r) => setTimeout(r, 0)); }
    }
    await enc.flush(); enc.close(); if (err) throw err;
    // traccia audio silenziosa (AAC-LC 48 kHz stereo): il file è strutturato come un video registrato dal telefono.
    // TikTok e Instagram sostituiscono il silenzio con la musica scelta nell'app.
    const SILENT = new Uint8Array([0x21, 0x00, 0x49, 0x90, 0x02, 0x19, 0x00, 0x23, 0x80]), fdur = 1024 / 48000 * 1e6;
    const meta = { decoderConfig: { codec: "mp4a.40.2", numberOfChannels: 2, sampleRate: 48000, description: new Uint8Array([0x11, 0x90]) } };
    for (let k = 0, na = Math.ceil(duration * 48000 / 1024); k < na; k++) muxer.addAudioChunkRaw(SILENT, "key", Math.round(k * fdur), Math.round(fdur), k === 0 ? meta : undefined);
    muxer.finalize(); onProgress(1);
    return new Blob([muxer.target.buffer], { type: "video/mp4" });
  },
  save(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); },
};

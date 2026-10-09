/* Build config. No data, secrets, tokens or keys live here.
   mode: "app" (normal) or "sandbox" (demo set preloaded, no network, quick actions simulated).
   previewGateHash: optional SHA-256 of a passcode for private test links only (null in published builds). */
window.IG_CONFIG = {
  mode: "sandbox",
  version: "1.0.0",
  previewGateHash: null,
  rememberDays: 30,
  idleLockMin: 30,
  backgroundLockMin: 5
};

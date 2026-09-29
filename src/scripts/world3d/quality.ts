export type QualityTier = "off" | "low" | "mid" | "high";

export interface QualityProfile {
  tier: Exclude<QualityTier, "off">;
  maxPixelRatio: number;
  particleScale: number;
  cloudOctaves: number;
}

const profiles: Record<QualityProfile["tier"], QualityProfile> = {
  low: { tier: "low", maxPixelRatio: 1, particleScale: 0.35, cloudOctaves: 3 },
  mid: { tier: "mid", maxPixelRatio: 1.25, particleScale: 0.65, cloudOctaves: 4 },
  high: { tier: "high", maxPixelRatio: 1.5, particleScale: 1, cloudOctaves: 5 }
};

const tiers: QualityTier[] = ["off", "low", "mid", "high"];

function probeRenderer() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  if (!gl) return null;
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const name = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "";
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return name;
}

// `?quality=off|low|mid|high` overrides detection, useful for testing on any device.
export function detectQuality(): QualityProfile | null {
  const override = new URLSearchParams(location.search).get("quality") as QualityTier | null;
  if (override && tiers.includes(override)) {
    if (override === "off") return null;
    return probeRenderer() === null ? null : profiles[override];
  }

  const renderer = probeRenderer();
  if (renderer === null) return null;
  if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return null;

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (coarse || memory <= 4 || cores <= 4) return profiles.low;
  if (/intel|uhd|iris|mali|adreno/i.test(renderer)) return profiles.mid;
  return profiles.high;
}

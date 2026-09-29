import * as THREE from "three";

export type WeatherKind = "default" | "clear" | "cloud" | "rain" | "fog" | "snow" | "storm" | "night";

type RidgeColors = [string, string, string, string, string];

interface WeatherPreset {
  skyTop: string;
  skyHorizon: string;
  glow: string;
  sunColor: string;
  /** Radians above the horizon / to the right of the view axis. */
  sunElevation: number;
  sunAzimuth: number;
  /** Cosine of the disc's angular radius. */
  sunSize: number;
  sunIntensity: number;
  /** Strength of the stepped rings around the disc. */
  halo: number;
  cloudCover: number;
  cloudLit: string;
  cloudShade: string;
  cloudSpeed: number;
  shadow: string;
  /** Paper-cut ridge layers, far to near. */
  ridges: RidgeColors;
  snowCaps: number;
  fog: number;
  stars: number;
  rain: number;
  snow: number;
  lightning: number;
  wind: number;
  precipColor: string;
}

const presets: Record<WeatherKind, WeatherPreset> = {
  default: {
    skyTop: "#c9d1e6", skyHorizon: "#f1eadf", glow: "#a9b9ec", sunColor: "#fbf6ea",
    sunElevation: 0.3, sunAzimuth: 0.34, sunSize: 0.99955, sunIntensity: 0.85, halo: 0.45,
    cloudCover: 0.36, cloudLit: "#fbf7ef", cloudShade: "#dcd8da", cloudSpeed: 0.012, shadow: "#2a2440",
    ridges: ["#d8d5dc", "#cbc8d3", "#bfbdcb", "#dbd0bf", "#cfc0a7"],
    snowCaps: 0, fog: 0.1, stars: 0, rain: 0, snow: 0, lightning: 0, wind: 0.2, precipColor: "#6b7894"
  },
  clear: {
    skyTop: "#86aee6", skyHorizon: "#f7ecd2", glow: "#ffd36b", sunColor: "#fff3c9",
    sunElevation: 0.4, sunAzimuth: 0.3, sunSize: 0.9995, sunIntensity: 1, halo: 0.55,
    cloudCover: 0.22, cloudLit: "#ffffff", cloudShade: "#e8dfce", cloudSpeed: 0.01, shadow: "#6a4a20",
    ridges: ["#c7d3dc", "#b7c7bd", "#a9bd98", "#d8c283", "#e3c679"],
    snowCaps: 0, fog: 0.04, stars: 0, rain: 0, snow: 0, lightning: 0, wind: 0.15, precipColor: "#56637a"
  },
  cloud: {
    skyTop: "#9fadb8", skyHorizon: "#dfe4e3", glow: "#eef4ee", sunColor: "#f3f1e6",
    sunElevation: 0.36, sunAzimuth: 0.3, sunSize: 0.9996, sunIntensity: 0.22, halo: 0.3,
    cloudCover: 0.74, cloudLit: "#f2f4f2", cloudShade: "#aeb8bf", cloudSpeed: 0.02, shadow: "#1c2630",
    ridges: ["#c3cbcd", "#b1bcbc", "#9faead", "#b8b9a2", "#a9ab93"],
    snowCaps: 0, fog: 0.2, stars: 0, rain: 0, snow: 0, lightning: 0, wind: 0.35, precipColor: "#56637a"
  },
  rain: {
    skyTop: "#6e8290", skyHorizon: "#c9d5da", glow: "#b4cad6", sunColor: "#dfe6ea",
    sunElevation: 0.3, sunAzimuth: 0.3, sunSize: 0.9996, sunIntensity: 0, halo: 0,
    cloudCover: 0.92, cloudLit: "#c7d0d6", cloudShade: "#7f8e99", cloudSpeed: 0.035, shadow: "#0f1b22",
    ridges: ["#a9b8bf", "#94a6ae", "#80949d", "#7d8c86", "#6f7f79"],
    snowCaps: 0, fog: 0.3, stars: 0, rain: 1, snow: 0, lightning: 0, wind: 0.6, precipColor: "#3e5566"
  },
  fog: {
    skyTop: "#c9ccc7", skyHorizon: "#e8e7e2", glow: "#ffffff", sunColor: "#f5f3ea",
    sunElevation: 0.3, sunAzimuth: 0.3, sunSize: 0.9994, sunIntensity: 0.35, halo: 0.5,
    cloudCover: 0.35, cloudLit: "#f4f3ef", cloudShade: "#d0d1cc", cloudSpeed: 0.008, shadow: "#3a3d3a",
    ridges: ["#d8d9d4", "#cfd1cc", "#c5c8c3", "#bcbfb8", "#b1b5ad"],
    snowCaps: 0, fog: 0.72, stars: 0, rain: 0, snow: 0, lightning: 0, wind: 0.1, precipColor: "#56637a"
  },
  snow: {
    skyTop: "#b3c6d2", skyHorizon: "#f1f4f2", glow: "#ffffff", sunColor: "#fbfdff",
    sunElevation: 0.25, sunAzimuth: 0.3, sunSize: 0.9996, sunIntensity: 0.3, halo: 0.4,
    cloudCover: 0.66, cloudLit: "#ffffff", cloudShade: "#c6d3dc", cloudSpeed: 0.012, shadow: "#2e4658",
    ridges: ["#dbe5eb", "#cfdce4", "#e6edf0", "#eef2f2", "#f7f8f6"],
    snowCaps: 1, fog: 0.25, stars: 0, rain: 0, snow: 1, lightning: 0, wind: 0.25, precipColor: "#ffffff"
  },
  storm: {
    skyTop: "#5f6b77", skyHorizon: "#9aa4ae", glow: "#8aa0c4", sunColor: "#c6d2e6",
    sunElevation: 0.3, sunAzimuth: 0.3, sunSize: 0.9996, sunIntensity: 0, halo: 0,
    cloudCover: 0.96, cloudLit: "#a3adb7", cloudShade: "#5c6773", cloudSpeed: 0.05, shadow: "#1a2129",
    ridges: ["#7f8a95", "#77828d", "#86909a", "#9099a2", "#9ba4ac"],
    snowCaps: 0, fog: 0.2, stars: 0, rain: 1.4, snow: 0, lightning: 1, wind: 1, precipColor: "#b8c6d8"
  },
  night: {
    skyTop: "#050b21", skyHorizon: "#1f2c57", glow: "#4a67c9", sunColor: "#eef1ff",
    sunElevation: 0.38, sunAzimuth: 0.33, sunSize: 0.99975, sunIntensity: 1, halo: 0.16,
    cloudCover: 0.18, cloudLit: "#2d3c69", cloudShade: "#141d3a", cloudSpeed: 0.008, shadow: "#000000",
    ridges: ["#182550", "#141f45", "#111a3b", "#0e1631", "#0b1128"],
    snowCaps: 0, fog: 0.05, stars: 1, rain: 0, snow: 0, lightning: 0, wind: 0.1, precipColor: "#dde6ff"
  }
};

type ColorKey = "skyTop" | "skyHorizon" | "glow" | "sunColor" | "cloudLit" | "cloudShade" | "shadow" | "precipColor";
type NumberKey = Exclude<keyof WeatherPreset, ColorKey | "ridges">;

const colorKeys: ColorKey[] = ["skyTop", "skyHorizon", "glow", "sunColor", "cloudLit", "cloudShade", "shadow", "precipColor"];
const numberKeys: NumberKey[] = [
  "sunElevation", "sunAzimuth", "sunSize", "sunIntensity", "halo", "cloudCover", "cloudSpeed",
  "snowCaps", "fog", "stars", "rain", "snow", "lightning", "wind"
];

/** A preset resolved into linear-space colors, so it can be blended every frame. */
export type WeatherState = Record<ColorKey, THREE.Color> & Record<NumberKey, number> & { ridges: THREE.Color[] };

export function isWeatherKind(value: unknown): value is WeatherKind {
  return typeof value === "string" && value in presets;
}

export function resolveWeather(kind: WeatherKind): WeatherState {
  const preset = presets[kind];
  const state = { ridges: preset.ridges.map((hex) => new THREE.Color(hex)) } as WeatherState;
  colorKeys.forEach((key) => { state[key] = new THREE.Color(preset[key]); });
  numberKeys.forEach((key) => { state[key] = preset[key]; });
  return state;
}

export function cloneWeather(source: WeatherState): WeatherState {
  const state = { ridges: source.ridges.map((color) => color.clone()) } as WeatherState;
  colorKeys.forEach((key) => { state[key] = source[key].clone(); });
  numberKeys.forEach((key) => { state[key] = source[key]; });
  return state;
}

export function lerpWeather(out: WeatherState, from: WeatherState, to: WeatherState, t: number) {
  colorKeys.forEach((key) => out[key].lerpColors(from[key], to[key], t));
  numberKeys.forEach((key) => { out[key] = THREE.MathUtils.lerp(from[key], to[key], t); });
  out.ridges.forEach((color, index) => color.lerpColors(from.ridges[index], to.ridges[index], t));
}

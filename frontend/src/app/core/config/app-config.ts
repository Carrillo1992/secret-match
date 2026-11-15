import { InjectionToken } from '@angular/core';

/** Deployment-specific settings, read from `/config.json` before the app boots. */
export interface AppConfig {
  /** Origin of the REST API, without a trailing slash, e.g. `http://localhost:8080`. */
  readonly apiBaseUrl: string;
  /** Our OAuth client id in Google Cloud. Absent when "Continuar con Google" is not set up. */
  readonly googleClientId?: string;
}

/** The {@link AppConfig} the app booted with. */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

const CONFIG_URL = '/config.json';

/**
 * The last config read from the network on this device. The service worker never caches
 * `/config.json` (#117: it differs per deploy and is rewritten after the build), so without this an
 * installed app opened offline could not start at all. It is only a fallback for when the network
 * cannot be reached: online, `/config.json` always wins.
 */
const REMEMBERED_KEY = 'secretmatch.appConfig';

export async function loadAppConfig(): Promise<AppConfig> {
  let response: Response;
  try {
    response = await fetch(CONFIG_URL);
  } catch (networkError) {
    const remembered = rememberedConfig();
    if (remembered) {
      return remembered;
    }
    throw networkError;
  }
  if (!response.ok) {
    throw new Error(`Could not load ${CONFIG_URL}: HTTP ${response.status}`);
  }
  const config = parseConfig(await response.json());
  if (!config) {
    throw new Error(`${CONFIG_URL} must define a non-empty "apiBaseUrl"`);
  }
  remember(config);
  return config;
}

function parseConfig(json: unknown): AppConfig | undefined {
  const config = (json ?? {}) as Partial<Record<keyof AppConfig, unknown>>;
  if (typeof config.apiBaseUrl !== 'string' || config.apiBaseUrl === '') {
    return undefined;
  }
  const googleClientId =
    typeof config.googleClientId === 'string' && config.googleClientId.trim() !== ''
      ? config.googleClientId.trim()
      : undefined;
  return {
    apiBaseUrl: config.apiBaseUrl.replace(/\/+$/, ''),
    ...(googleClientId ? { googleClientId } : {}),
  };
}

function rememberedConfig(): AppConfig | undefined {
  try {
    const stored = localStorage.getItem(REMEMBERED_KEY);
    return stored ? parseConfig(JSON.parse(stored)) : undefined;
  } catch {
    // Storage blocked or a damaged entry: nothing to fall back on.
    return undefined;
  }
}

function remember(config: AppConfig): void {
  try {
    localStorage.setItem(REMEMBERED_KEY, JSON.stringify(config));
  } catch {
    // Storage blocked: offline starts are not possible on this device.
  }
}

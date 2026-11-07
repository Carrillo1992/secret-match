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

export async function loadAppConfig(): Promise<AppConfig> {
  const response = await fetch(CONFIG_URL);
  if (!response.ok) {
    throw new Error(`Could not load ${CONFIG_URL}: HTTP ${response.status}`);
  }
  const config = (await response.json()) as Partial<Record<keyof AppConfig, unknown>>;
  if (typeof config.apiBaseUrl !== 'string' || config.apiBaseUrl === '') {
    throw new Error(`${CONFIG_URL} must define a non-empty "apiBaseUrl"`);
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

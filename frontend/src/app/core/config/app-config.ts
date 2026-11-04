import { InjectionToken } from '@angular/core';

/** Deployment-specific settings, read from `/config.json` before the app boots. */
export interface AppConfig {
  /** Origin of the REST API, without a trailing slash, e.g. `http://localhost:8080`. */
  readonly apiBaseUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export async function loadAppConfig(url = '/config.json'): Promise<AppConfig> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url}: HTTP ${response.status}`);
  }
  const config = (await response.json()) as Partial<AppConfig>;
  if (typeof config.apiBaseUrl !== 'string' || config.apiBaseUrl === '') {
    throw new Error(`${url} must define a non-empty "apiBaseUrl"`);
  }
  return { apiBaseUrl: config.apiBaseUrl.replace(/\/+$/, '') };
}

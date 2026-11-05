/** Deployment-specific settings, read from `/config.json` before the app boots. */
export interface AppConfig {
  /** Origin of the REST API, without a trailing slash, e.g. `http://localhost:8080`. */
  readonly apiBaseUrl: string;
}

const CONFIG_URL = '/config.json';

export async function loadAppConfig(): Promise<AppConfig> {
  const response = await fetch(CONFIG_URL);
  if (!response.ok) {
    throw new Error(`Could not load ${CONFIG_URL}: HTTP ${response.status}`);
  }
  const config = (await response.json()) as Partial<AppConfig>;
  if (typeof config.apiBaseUrl !== 'string' || config.apiBaseUrl === '') {
    throw new Error(`${CONFIG_URL} must define a non-empty "apiBaseUrl"`);
  }
  return { apiBaseUrl: config.apiBaseUrl.replace(/\/+$/, '') };
}

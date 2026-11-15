// Turns the production build into a Cloudflare Pages site (`npm run build:pages`): writes the
// runtime config.json from the Pages environment variables and adds the Pages `_headers` file.
// The Pages counterpart of docker/40-write-app-config.sh and docker/nginx.conf.
import { copyFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUTPUT_DIR = new URL('../dist/secret-match/browser/', import.meta.url);
const HEADERS_FILE = new URL('./_headers', import.meta.url);

/**
 * The content of config.json for these environment variables, with the same rules as the Docker
 * entrypoint: API_BASE_URL is required, GOOGLE_CLIENT_ID is optional (without it the SPA does not
 * offer "Continuar con Google").
 */
export function appConfigJson(env) {
  const apiBaseUrl = env.API_BASE_URL ?? '';
  if (apiBaseUrl === '') {
    throw new Error(
      'API_BASE_URL must be set (the API origin the browser calls, e.g. https://api.secret-match.app)',
    );
  }
  return `${JSON.stringify({ apiBaseUrl, googleClientId: env.GOOGLE_CLIENT_ID ?? '' }, null, 2)}\n`;
}

/** Writes config.json and `_headers` into the build output directory `outputDir`. */
export function finishBuild(env, outputDir = OUTPUT_DIR) {
  const config = appConfigJson(env);
  writeFileSync(new URL('config.json', outputDir), config);
  copyFileSync(HEADERS_FILE, new URL('_headers', outputDir));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    finishBuild(process.env);
    console.log(`Cloudflare Pages output ready in ${fileURLToPath(OUTPUT_DIR)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

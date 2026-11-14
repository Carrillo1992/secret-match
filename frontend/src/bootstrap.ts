import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Language } from './app/core/language';
import { loadAppConfig } from './app/core/config/app-config';

/** Starts the app in `language`, once `main.ts` has loaded its translations. */
export async function bootstrap(language: Language): Promise<void> {
  // English (en-US) data ships with Angular; Spanish plural rules and formats need registering.
  registerLocaleData(localeEs);
  const config = await loadAppConfig();
  await bootstrapApplication(App, appConfig(config, language));
}

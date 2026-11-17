import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideApiConfiguration } from './core/api/generated/api-configuration';
import { authInterceptor } from './core/auth/auth.interceptor';
import { APP_CONFIG, AppConfig } from './core/config/app-config';
import { Language } from './core/language';
import { LanguagePreference } from './core/preferences/language-preference';
import { AppInstall } from './core/install/app-install';
import { DevicePush } from './core/push/device-push';
import { AppUpdates } from './core/updates/app-updates';
import { routes } from './app.routes';

export function appConfig(config: AppConfig, language: Language): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(routes),
      provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
      provideApiConfiguration(config.apiBaseUrl),
      { provide: APP_CONFIG, useValue: config },
      { provide: LOCALE_ID, useValue: language },
      // Signing in, or coming back signed in, shows the app in the User's Language (#91).
      provideAppInitializer(() => inject(LanguagePreference).followTheUser()),
      // The installable app (#117): production builds only, so `ng serve` runs without one.
      // app-sw.js wraps Angular's ngsw-worker.js and keeps the API and config.json away from it.
      provideServiceWorker('app-sw.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000',
      }),
      provideAppInitializer(() => inject(AppUpdates).start()),
      provideAppInitializer(() => inject(AppInstall).start()),
      // Notifications on this device (#119); after AppInstall, which tells an uninstalled iPhone.
      provideAppInitializer(() => inject(DevicePush).start()),
    ],
  };
}

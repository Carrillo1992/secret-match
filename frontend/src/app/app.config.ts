import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from './core/api/generated/api-configuration';
import { authInterceptor } from './core/auth/auth.interceptor';
import { APP_CONFIG, AppConfig } from './core/config/app-config';
import { Language } from './core/language';
import { LanguagePreference } from './core/preferences/language-preference';
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
    ],
  };
}

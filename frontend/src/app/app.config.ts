import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from './core/api/generated/api-configuration';
import { AppConfig } from './core/config/app-config';
import { routes } from './app.routes';

export function appConfig(config: AppConfig): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(routes),
      provideHttpClient(withFetch()),
      provideApiConfiguration(config.apiBaseUrl),
    ],
  };
}

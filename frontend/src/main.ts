import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { loadAppConfig } from './app/core/config/app-config';

loadAppConfig()
  .then((config) => bootstrapApplication(App, appConfig(config)))
  .catch((err: unknown) => {
    // Without config (or if bootstrap fails) Angular never renders: say so instead of a blank page.
    document.body.textContent =
      'SecretMatch no se ha podido iniciar. Recarga la página en unos minutos.';
    console.error(err);
  });
// throwaway CI probe

import { loadTranslations } from '@angular/localize';
import { catchEarlyInstallOffer } from './app/core/install/app-install';
import { currentLanguage, Language } from './app/core/language';

// Chromium may offer installing before the app has started (#118): AppInstall picks it up.
catchEarlyInstallOffer(window);

/**
 * The Language is resolved before anything else runs (ADR 0005): the app module graph is only
 * imported once the translations are in, because copy written with `$localize` at module level is
 * translated as its module loads. Switching the Language reloads the page and comes back here.
 */
const language = currentLanguage();
document.documentElement.lang = language;

loadLanguage(language)
  .then(() => import('./bootstrap'))
  .then(({ bootstrap }) => bootstrap(language))
  .catch((err: unknown) => {
    // Without config (or if bootstrap fails) Angular never renders: say so instead of a blank page.
    document.body.textContent = $localize`SecretMatch no se ha podido iniciar. Recarga la página en unos minutos.`;
    console.error(err);
  });

/** Spanish is the source copy; English is a translation, fetched only for those who read it. */
async function loadLanguage(language: Language): Promise<void> {
  if (language === 'en') {
    const english = await import('./locale/messages.en.json');
    loadTranslations(english.translations);
  }
}

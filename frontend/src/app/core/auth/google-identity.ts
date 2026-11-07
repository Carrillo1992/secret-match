import { DOCUMENT, inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/** The part of Google Identity Services (`google.accounts.id`) the SPA uses. */
interface GoogleAccountsId {
  initialize(options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleAccountsId } } };

/**
 * "Continuar con Google" through Google Identity Services: loads Google's script on first use and
 * draws Google's own button, which hands back an ID token for the API (docs/architecture.md §2.4).
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentity {
  private readonly clientId = inject(APP_CONFIG, { optional: true })?.googleClientId;
  private readonly document = inject(DOCUMENT);
  private loading: Promise<GoogleAccountsId | null> | null = null;

  /**
   * Draws Google's button inside `parent`, as wide as `width` allows (Google's limits are 200 to
   * 400 px). `onIdToken` gets the ID token of each sign-in made through it.
   *
   * @returns `false`, drawing nothing, when Google sign-in is not set up or Google's script cannot
   *   load
   */
  async renderButton(
    parent: HTMLElement,
    width: number,
    onIdToken: (idToken: string) => void,
  ): Promise<boolean> {
    const clientId = this.clientId;
    if (!clientId) {
      return false;
    }
    const accounts = await this.load();
    if (!accounts) {
      return false;
    }
    accounts.initialize({
      client_id: clientId,
      callback: (response) => onIdToken(response.credential),
    });
    accounts.renderButton(parent, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'center',
      locale: 'es',
      width: Math.round(Math.min(400, Math.max(200, width))),
    });
    return true;
  }

  private load(): Promise<GoogleAccountsId | null> {
    this.loading ??= new Promise((resolve) => {
      const loaded = () => (this.document.defaultView as GoogleWindow | null)?.google?.accounts?.id;
      const already = loaded();
      if (already) {
        resolve(already);
        return;
      }
      const script = this.document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(loaded() ?? null);
      script.onerror = () => {
        this.loading = null;
        script.remove();
        resolve(null);
      };
      this.document.head.appendChild(script);
    });
    return this.loading;
  }
}

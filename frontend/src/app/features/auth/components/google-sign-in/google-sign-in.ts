import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AuthSession, GoogleSignInOutcome } from '../../../../core/auth/auth-session';
import { GoogleIdentity } from '../../../../core/auth/google-identity';
import { Alert } from '../../../../shared/ui/alert/alert';

type GoogleError = Exclude<GoogleSignInOutcome, 'signed-in'>;

/**
 * "Continuar con Google" above the email form of a doorway screen (option A in #16): Google's own
 * button, an alert when the sign-in fails, and an "o con tu correo" divider. It shows nothing at all
 * when Google sign-in is not set up or Google's script cannot load.
 */
@Component({
  selector: 'app-google-sign-in',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert],
  template: `
    <div [hidden]="!available()" class="mt-6">
      <!-- Google's button is a light iframe: a dark page around it would paint it a white box. -->
      <div #button class="flex min-h-11 justify-center [color-scheme:light]"></div>
      @if (error(); as error) {
        <p appAlert class="mt-3">
          @if (error === 'rejected') {
            Google no ha podido confirmar quién eres. Vuelve a intentarlo.
          } @else {
            No hemos podido entrar con Google. Inténtalo de nuevo en un momento.
          }
        </p>
      }
      <div class="mt-6 flex items-center gap-3 text-sm text-ink-muted" aria-hidden="true">
        <span class="h-px flex-1 bg-line"></span>
        o con tu correo
        <span class="h-px flex-1 bg-line"></span>
      </div>
    </div>
  `,
})
export class GoogleSignIn {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly google = inject(GoogleIdentity);
  private readonly session = inject(AuthSession);
  private readonly button = viewChild.required<ElementRef<HTMLElement>>('button');

  /** Emitted once the API has opened the session. */
  readonly signedIn = output();

  protected readonly available = signal(false);
  protected readonly error = signal<GoogleError | null>(null);
  private sending = false;

  constructor() {
    afterNextRender(async () => {
      const shown = await this.google.renderButton(
        this.button().nativeElement,
        this.host.nativeElement.clientWidth,
        (idToken) => this.signIn(idToken),
      );
      this.available.set(shown);
    });
  }

  private async signIn(idToken: string): Promise<void> {
    if (this.sending) {
      return;
    }
    this.sending = true;
    this.error.set(null);
    const outcome = await this.session.signInWithGoogle(idToken);
    this.sending = false;
    if (outcome === 'signed-in') {
      this.signedIn.emit();
    } else {
      this.error.set(outcome);
    }
  }
}

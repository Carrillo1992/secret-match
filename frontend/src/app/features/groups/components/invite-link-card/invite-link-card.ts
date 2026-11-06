import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { LucideCopy, LucideRefreshCw } from '@lucide/angular';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';

/** Where the Admin's last regeneration stands, as the page tells it. */
export type RegenerateStatus = 'idle' | 'regenerating' | 'regenerated' | 'failed';

type Notice = 'copied' | 'copy-failed' | null;

/**
 * The Group's Invite Link, for every Member to copy and share. Only the Admin gets the action to
 * regenerate it, behind an inline confirmation because the current link stops working.
 */
@Component({
  selector: 'app-invite-link-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Field, TextLink, LucideCopy, LucideRefreshCw],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-invite" class="rounded-card bg-surface p-5 shadow-card">
      <h2 id="group-invite" class="font-display text-lg font-semibold">Invita a tu gente</h2>
      <p class="mt-1.5 text-ink-muted">Comparte este enlace para que se unan al grupo.</p>

      <div class="mt-4 flex flex-col gap-1.5">
        <label for="group-invite-link" class="font-bold">Enlace de invitación</label>
        <input
          #linkField
          id="group-invite-link"
          type="text"
          readonly
          appField
          [value]="link()"
          (focus)="linkField.select()"
        />
      </div>

      <button type="button" appButton="secondary" class="mt-4 w-full" (click)="copy(linkField)">
        <svg lucideCopy [size]="18"></svg>
        Copiar enlace
      </button>

      <p role="status" class="mt-2 text-sm text-ink-muted">{{ statusText() }}</p>

      @if (regenerateStatus() === 'failed') {
        <p
          role="alert"
          class="mt-2 rounded-field bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          No hemos podido generar un enlace nuevo. El actual sigue funcionando.
        </p>
      }

      @if (admin()) {
        @if (confirming()) {
          <div class="mt-4 rounded-field bg-canvas p-4">
            <p class="font-bold">¿Generar un enlace nuevo?</p>
            <p class="mt-1.5 text-sm text-ink-muted">
              El enlace actual dejará de funcionar. Quien ya está en el grupo sigue dentro.
            </p>
            <div class="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                appButton="secondary"
                [disabled]="regenerateStatus() === 'regenerating'"
                (click)="confirm()"
              >
                Sí, generar uno nuevo
              </button>
              <button type="button" appLink standalone (click)="confirming.set(false)">
                Cancelar
              </button>
            </div>
          </div>
        } @else {
          <button
            type="button"
            appLink
            standalone
            class="mt-2 gap-1.5"
            [disabled]="regenerateStatus() === 'regenerating'"
            (click)="startConfirming()"
          >
            <svg lucideRefreshCw [size]="16"></svg>
            {{ regenerateStatus() === 'regenerating' ? 'Generando…' : 'Generar uno nuevo' }}
          </button>
        }
      }
    </section>
  `,
})
export class InviteLinkCard {
  /** The full link to share. */
  readonly link = input.required<string>();
  /** Whether the Member looking is the Admin, who alone can regenerate it. */
  readonly admin = input.required<boolean>();
  readonly regenerateStatus = input<RegenerateStatus>('idle');
  /** The Admin confirmed: the page asks the API for a new link. */
  readonly regenerate = output();

  protected readonly confirming = signal(false);
  private readonly notice = signal<Notice>(null);

  protected statusText(): string {
    switch (this.notice()) {
      case 'copied':
        return '¡Enlace copiado!';
      case 'copy-failed':
        return 'No hemos podido copiarlo: selecciona el enlace y cópialo a mano.';
      default:
        return this.regenerateStatus() === 'regenerated'
          ? 'Enlace nuevo listo. El anterior ya no funciona.'
          : '';
    }
  }

  protected async copy(field: HTMLInputElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link());
      this.notice.set('copied');
    } catch {
      field.select();
      this.notice.set('copy-failed');
    }
  }

  protected startConfirming(): void {
    this.notice.set(null);
    this.confirming.set(true);
  }

  protected confirm(): void {
    this.confirming.set(false);
    this.regenerate.emit();
  }
}

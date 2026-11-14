import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucidePlus } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { PREFERENCES_MAX_LENGTH, WishlistApi } from '../../data-access/wishlist-api';

/** How the owner's last save went. */
type SaveStatus = 'idle' | 'saving' | 'invalid' | 'failed';

/**
 * A Member's Preferences in a Group (#33): the free text on a surface card, read-only to their
 * Giver and hidden from them when there is none. The owner edits it in place, in a `bg-canvas`
 * well with a counter out of 2000; saving it blank clears it. The card saves through the API
 * itself and tells the page the new text.
 */
@Component({
  selector: 'app-preferences-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, Field, ReactiveFormsModule, TextLink, LucidePlus],
  host: { class: 'block empty:hidden' },
  template: `
    @if (owner() || preferences()) {
      <section aria-labelledby="preferences-title" class="rounded-card bg-surface p-5 shadow-card">
        <h2 id="preferences-title" class="font-display text-lg font-semibold">
          {{ owner() ? 'Tus gustos' : 'Sus gustos' }}
        </h2>

        @if (owner()) {
          <p role="status" class="mt-1.5 text-sm text-ink-muted empty:hidden">{{ statusText() }}</p>
        }

        @if (editing()) {
          <form
            class="mt-3 flex flex-col gap-1.5 rounded-field bg-canvas p-4"
            [formGroup]="form"
            (ngSubmit)="save()"
            novalidate
          >
            <label for="preferences-text" class="font-bold">Tus gustos</label>
            <textarea
              id="preferences-text"
              rows="5"
              appField
              formControlName="text"
              placeholder="Tallas, colores, aficiones, lo que te gusta… Por ejemplo: talla M, pie 42, me encanta el café y el senderismo."
              [attr.aria-invalid]="showsError() || null"
              [attr.aria-describedby]="
                showsError() ? 'preferences-count preferences-error' : 'preferences-count'
              "
            ></textarea>
            <p
              id="preferences-count"
              data-counter
              class="text-sm"
              [class.text-ink-muted]="!tooLong()"
              [class.text-danger]="tooLong()"
              [class.font-semibold]="tooLong()"
            >
              {{ length() }} / {{ maxLength }}
            </p>
            @if (showsError()) {
              <p id="preferences-error" class="text-sm font-semibold text-danger">
                Como mucho {{ maxLength }} caracteres.
              </p>
            }
            @if (status() === 'failed') {
              <p appAlert>No hemos podido guardar tus gustos. Inténtalo de nuevo.</p>
            }
            <div class="mt-2 flex flex-wrap items-center gap-4">
              <button type="submit" appButton="secondary" [disabled]="status() === 'saving'">
                {{ status() === 'saving' ? 'Guardando…' : 'Guardar' }}
              </button>
              <button type="button" appLink standalone (click)="close()">Cancelar</button>
            </div>
          </form>
        } @else if (preferences(); as preferences) {
          <p class="mt-1.5 whitespace-pre-line break-words">{{ preferences }}</p>
          @if (owner()) {
            <div class="mt-1 flex justify-end">
              <button
                id="edit-preferences"
                type="button"
                appLink
                standalone
                aria-label="Editar tus gustos"
                (click)="open()"
              >
                Editar
              </button>
            </div>
          }
        } @else {
          <p class="mt-1.5 text-ink-muted">
            Cuenta tus tallas, gustos y aficiones para orientar a quien te regale.
          </p>
          <button
            id="edit-preferences"
            type="button"
            appLink
            standalone
            class="mt-1 gap-1"
            (click)="open()"
          >
            <svg lucidePlus [size]="18"></svg>
            Escribir mis gustos
          </button>
        }
      </section>
    }
  `,
})
export class PreferencesCard {
  readonly groupId = input.required<string>();
  /** `undefined` when the Member has written none. */
  readonly preferences = input.required<string | undefined>();
  /** Only the owner changes them (ADR 0004); their Giver reads them. */
  readonly owner = input.required<boolean>();
  readonly ownerName = input.required<string>();
  /** The saved text after a change, `undefined` once cleared. */
  readonly preferencesChange = output<string | undefined>();

  private readonly api = inject(WishlistApi);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly maxLength = PREFERENCES_MAX_LENGTH;
  protected readonly form = inject(NonNullableFormBuilder).group({
    text: ['', Validators.maxLength(PREFERENCES_MAX_LENGTH)],
  });
  private readonly text = this.form.controls.text;
  private readonly value = toSignal(this.text.valueChanges, { initialValue: '' });
  protected readonly length = computed(() => this.value().length);
  protected readonly tooLong = computed(() => this.length() > PREFERENCES_MAX_LENGTH);

  protected readonly editing = signal(false);
  protected readonly submitted = signal(false);
  protected readonly status = signal<SaveStatus>('idle');
  protected readonly statusText = signal('');

  protected showsError(): boolean {
    return (this.submitted() && this.tooLong()) || this.status() === 'invalid';
  }

  protected open(): void {
    this.text.setValue(this.preferences() ?? '');
    this.submitted.set(false);
    this.status.set('idle');
    this.statusText.set('');
    this.editing.set(true);
    this.focusOnceRendered('preferences-text');
  }

  protected close(): void {
    this.editing.set(false);
    this.focusOnceRendered('edit-preferences');
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    if (this.tooLong() || this.status() === 'saving') {
      return;
    }
    this.status.set('saving');
    const outcome = await this.api.editPreferences(this.groupId(), this.text.getRawValue());
    if (outcome.status !== 'saved') {
      this.status.set(outcome.status);
      return;
    }
    this.status.set('idle');
    this.statusText.set(outcome.preferences ? 'Gustos guardados.' : 'Gustos borrados.');
    this.preferencesChange.emit(outcome.preferences);
    this.close();
  }

  private focusOnceRendered(id: string): void {
    afterNextRender(() => this.document.getElementById(id)?.focus(), { injector: this.injector });
  }
}

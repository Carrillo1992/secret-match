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
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { LucideBan, LucidePlus, LucideX } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import {
  DONT_LIST_ENTRY_MAX_LENGTH,
  DontListEntry,
  WishlistApi,
} from '../../data-access/wishlist-api';

/**
 * A Member's Don't List, "Nada de…" (#33, option A): a warning card in `danger-soft` listing what
 * they do not want to receive, oldest first. Its owner removes an entry at once with its ✕ (it is
 * short and easy to type again) and adds one through an inline form; the Giver only reads it, and
 * an empty one is not shown to them at all.
 */
@Component({
  selector: 'app-dont-list-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, Field, ReactiveFormsModule, TextLink, LucideBan, LucidePlus, LucideX],
  host: { class: 'block empty:hidden' },
  template: `
    @if (owner() || entries().length > 0) {
      <section
        aria-labelledby="dont-list-heading"
        class="rounded-card bg-danger-soft p-5 shadow-card"
      >
        <h2
          id="dont-list-heading"
          tabindex="-1"
          class="flex items-center gap-2 font-display text-lg font-semibold text-danger focus:outline-none"
        >
          <svg lucideBan [size]="20" class="shrink-0"></svg>
          Nada de…
        </h2>

        @if (owner()) {
          <p role="status" class="mt-1.5 text-sm empty:hidden">{{ announcement() }}</p>
          @if (failedRemoval(); as entry) {
            <p appAlert class="mt-3">
              No hemos podido quitar «{{ entry.text }}». Inténtalo de nuevo.
            </p>
          }
          @if (entries().length === 0) {
            <p class="mt-1.5">Apunta lo que no quieres recibir, para que nadie te lo regale.</p>
          }
        }

        <ul [attr.aria-label]="listLabel()" class="mt-3 flex flex-col gap-1 empty:hidden">
          @for (entry of entries(); track entry.id) {
            <li class="flex min-h-11 items-center gap-2">
              <svg lucideBan [size]="18" class="shrink-0 text-danger"></svg>
              <span class="min-w-0 flex-1 font-semibold break-words">{{ entry.text }}</span>
              @if (owner()) {
                <button
                  type="button"
                  [id]="removeButtonId(entry)"
                  class="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-danger transition-colors duration-200 hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                  [attr.aria-label]="'Quitar «' + entry.text + '»'"
                  [disabled]="removing().has(entry.id)"
                  (click)="remove(entry)"
                >
                  <svg lucideX [size]="20"></svg>
                </button>
              }
            </li>
          }
        </ul>

        @if (owner()) {
          @if (formOpen()) {
            <form
              class="mt-3 flex flex-col gap-1.5 rounded-field bg-surface p-4"
              [formGroup]="form"
              (ngSubmit)="submit()"
              novalidate
            >
              <label for="dont-list-entry-text" class="font-bold">¿Qué no quieres recibir?</label>
              <input
                id="dont-list-entry-text"
                type="text"
                appField
                formControlName="text"
                placeholder="Por ejemplo: nada de chocolate"
                [attr.aria-invalid]="showsError() || null"
                [attr.aria-describedby]="
                  showsError() ? 'dont-list-entry-error' : 'dont-list-entry-hint'
                "
              />
              @if (showsError()) {
                <p id="dont-list-entry-error" class="text-sm font-semibold text-danger">
                  @if (form.controls.text.hasError('blank')) {
                    Escribe qué no quieres recibir.
                  } @else {
                    Como mucho {{ maxLength }} caracteres.
                  }
                </p>
              } @else {
                <p id="dont-list-entry-hint" class="text-sm text-ink-muted">
                  Hasta {{ maxLength }} caracteres.
                </p>
              }
              @if (addFailed()) {
                <p appAlert class="mt-1.5">No hemos podido añadirlo. Inténtalo de nuevo.</p>
              }
              <div class="mt-2 flex flex-wrap items-center gap-4">
                <button type="submit" appButton="secondary" [disabled]="adding()">
                  {{ adding() ? 'Añadiendo…' : 'Añadir' }}
                </button>
                <button type="button" appLink standalone (click)="close()">Cancelar</button>
              </div>
            </form>
          } @else {
            <button
              id="add-dont-list-entry"
              type="button"
              appLink
              standalone
              tone="danger"
              class="mt-1 gap-1"
              (click)="open()"
            >
              <svg lucidePlus [size]="18"></svg>
              Añadir
            </button>
          }
        }
      </section>
    }
  `,
})
export class DontListCard {
  readonly groupId = input.required<string>();
  /** Oldest first. */
  readonly entries = input.required<readonly DontListEntry[]>();
  /** The signed-in Member owns this Wishlist, so they may change it. */
  readonly owner = input.required<boolean>();
  readonly ownerName = input.required<string>();
  /** The Don't List after an entry was added (at the end) or removed. */
  readonly entriesChange = output<readonly DontListEntry[]>();

  private readonly api = inject(WishlistApi);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly maxLength = DONT_LIST_ENTRY_MAX_LENGTH;
  protected readonly form = new FormGroup({
    text: new FormControl('', { nonNullable: true, validators: entryRules }),
  });
  protected readonly formOpen = signal(false);
  private readonly submitted = signal(false);
  protected readonly adding = signal(false);
  protected readonly addFailed = signal(false);
  /** Ids of the entries being removed right now. */
  protected readonly removing = signal<ReadonlySet<string>>(new Set());
  protected readonly failedRemoval = signal<DontListEntry | null>(null);
  protected readonly announcement = signal('');

  protected readonly listLabel = computed(() =>
    this.owner() ? 'Lo que no quieres recibir' : `Lo que ${this.ownerName()} no quiere recibir`,
  );

  protected removeButtonId(entry: DontListEntry): string {
    return `remove-dont-list-entry-${entry.id}`;
  }

  protected showsError(): boolean {
    return this.form.invalid && this.submitted();
  }

  protected open(): void {
    this.form.reset();
    this.submitted.set(false);
    this.addFailed.set(false);
    this.formOpen.set(true);
    this.focusOnceRendered('dont-list-entry-text');
  }

  protected close(): void {
    this.formOpen.set(false);
    this.focusOnceRendered('add-dont-list-entry');
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.addFailed.set(false);
    if (this.form.invalid || this.adding()) {
      return;
    }
    this.adding.set(true);
    const outcome = await this.api.addDontListEntry(
      this.groupId(),
      this.form.controls.text.value.trim(),
    );
    this.adding.set(false);
    switch (outcome.status) {
      case 'added':
        this.entriesChange.emit([...this.entries(), outcome.entry]);
        this.announcement.set(`Añadido «${outcome.entry.text}».`);
        this.close();
        break;
      case 'invalid':
        // The API only refuses what the form lets through when it is too long for it.
        this.form.controls.text.setErrors({ tooLong: true });
        break;
      case 'failed':
        this.addFailed.set(true);
        break;
    }
  }

  protected async remove(entry: DontListEntry): Promise<void> {
    this.failedRemoval.set(null);
    this.removing.update((ids) => new Set(ids).add(entry.id));
    const outcome = await this.api.deleteDontListEntry(this.groupId(), entry.id);
    this.removing.update((ids) => {
      const rest = new Set(ids);
      rest.delete(entry.id);
      return rest;
    });
    if (outcome.status === 'failed') {
      this.failedRemoval.set(entry);
      this.focusOnceRendered(this.removeButtonId(entry));
      return;
    }
    const entries = this.entries();
    const index = entries.findIndex((other) => other.id === entry.id);
    const rest = entries.filter((other) => other.id !== entry.id);
    this.entriesChange.emit(rest);
    this.announcement.set(`Quitado «${entry.text}».`);
    // Focus goes to the entry that takes its place, else the one before, else "Añadir".
    const neighbour = rest[Math.min(index, rest.length - 1)];
    this.focusOnceRendered(
      neighbour
        ? this.removeButtonId(neighbour)
        : this.formOpen()
          ? 'dont-list-heading'
          : 'add-dont-list-entry',
    );
  }

  private focusOnceRendered(id: string): void {
    afterNextRender(() => this.document.getElementById(id)?.focus(), { injector: this.injector });
  }
}

/** The API's rules, on the text as it will be sent: trimmed. */
function entryRules(control: AbstractControl<string>): ValidationErrors | null {
  const text = control.value.trim();
  if (text === '') {
    return { blank: true };
  }
  return text.length > DONT_LIST_ENTRY_MAX_LENGTH ? { tooLong: true } : null;
}

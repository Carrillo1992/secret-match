import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideBan, LucidePlus, LucideX } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { DontListEntry } from '../../data-access/wishlist-api';
import { DONT_LIST_ENTRY_MAX_LENGTH, dontListEntry } from '../../data-access/wishlist-rules';

/** How the page's last addition of an entry went. */
export type DontListAddition =
  | { readonly status: 'adding' }
  | { readonly status: 'added'; readonly entry: DontListEntry }
  | { readonly status: 'invalid' }
  | { readonly status: 'failed' };

/** How the page's last removal of an entry went. */
export interface DontListRemoval {
  readonly entry: DontListEntry;
  readonly status: 'removing' | 'removed' | 'failed';
}

/**
 * A Member's Don't List, "Nada de…" (#33, option A): a warning card in `danger-soft` listing what
 * they do not want to receive, oldest first. Its owner removes an entry at once with its ✕ (it is
 * short and easy to type again) and adds one through an inline form; the Giver only reads it, and
 * an empty one is not shown to them at all. The page changes the Don't List through the API and
 * reports back through `addition` and `removal`; the card then closes its form, says what happened
 * and moves focus.
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
                  class="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-danger transition-colors duration-200 hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-60"
                  [attr.aria-label]="'Quitar «' + entry.text + '»'"
                  [disabled]="isRemoving(entry)"
                  (click)="removeNow(entry)"
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
              @if (submitted() && addition()?.status === 'failed') {
                <p appAlert class="mt-1.5">No hemos podido añadirlo. Inténtalo de nuevo.</p>
              }
              <div class="mt-2 flex flex-wrap items-center gap-4">
                <button type="submit" appButton="secondary" [disabled]="isAdding()">
                  {{ isAdding() ? 'Añadiendo…' : 'Añadir' }}
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
  /** Oldest first. */
  readonly entries = input.required<readonly DontListEntry[]>();
  /** The signed-in Member owns this Wishlist, so they may change it. */
  readonly owner = input.required<boolean>();
  readonly ownerName = input.required<string>();
  readonly addition = input<DontListAddition | null>(null);
  readonly removal = input<DontListRemoval | null>(null);
  /** The owner sent a new entry, trimmed: the page adds it at the end of the Don't List. */
  readonly add = output<string>();
  /** The owner removed an entry: the page asks the API to remove it, without confirming. */
  readonly remove = output<DontListEntry>();

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly maxLength = DONT_LIST_ENTRY_MAX_LENGTH;
  protected readonly form = new FormGroup({
    text: new FormControl('', { nonNullable: true, validators: dontListEntry }),
  });
  protected readonly formOpen = signal(false);
  protected readonly submitted = signal(false);
  protected readonly announcement = signal('');
  /** Where the entry the owner is removing stood, to give focus to its neighbour once it goes. */
  private removedAt: number | null = null;

  protected readonly listLabel = computed(() =>
    this.owner() ? 'Lo que no quieres recibir' : `Lo que ${this.ownerName()} no quiere recibir`,
  );
  protected readonly isAdding = computed(() => this.addition()?.status === 'adding');
  protected readonly failedRemoval = computed(() => {
    const removal = this.removal();
    return removal?.status === 'failed' ? removal.entry : null;
  });

  constructor() {
    effect(() => {
      const addition = this.addition();
      if (addition?.status === 'added' && untracked(this.formOpen)) {
        untracked(() => {
          this.announcement.set(`Añadido «${addition.entry.text}».`);
          this.close();
        });
      }
    });
    effect(() => {
      const removal = this.removal();
      if (removal && removal.status !== 'removing') {
        untracked(() => this.removalDone(removal));
      }
    });
  }

  protected removeButtonId(entry: DontListEntry): string {
    return `remove-dont-list-entry-${entry.id}`;
  }

  protected isRemoving(entry: DontListEntry): boolean {
    const removal = this.removal();
    return removal?.status === 'removing' && removal.entry.id === entry.id;
  }

  /** The API refusing the entry is shown on the field, like the form's own check. */
  protected showsError(): boolean {
    return this.submitted() && (this.form.invalid || this.addition()?.status === 'invalid');
  }

  protected open(): void {
    this.form.reset();
    this.submitted.set(false);
    this.formOpen.set(true);
    this.focusOnceRendered('dont-list-entry-text');
  }

  protected close(): void {
    this.formOpen.set(false);
    this.focusOnceRendered('add-dont-list-entry');
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.isAdding()) {
      return;
    }
    this.add.emit(this.form.controls.text.value.trim());
  }

  protected removeNow(entry: DontListEntry): void {
    this.removedAt = this.entries().findIndex((other) => other.id === entry.id);
    this.remove.emit(entry);
  }

  private removalDone(removal: DontListRemoval): void {
    const index = this.removedAt;
    if (index === null) {
      return;
    }
    this.removedAt = null;
    if (removal.status === 'failed') {
      this.focusOnceRendered(this.removeButtonId(removal.entry));
      return;
    }
    this.announcement.set(`Quitado «${removal.entry.text}».`);
    // Focus goes to the entry that takes its place, else the one before, else "Añadir".
    const rest = this.entries();
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

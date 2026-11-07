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
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { LucideArrowLeftRight, LucidePlus } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { Exclusion } from '../../data-access/exclusions-api';
import { Member } from '../members-card/members-card';

/** The Group's Exclusions as the page has them. */
export type ExclusionsListing =
  | { readonly status: 'loading' }
  | { readonly status: 'failed' }
  | { readonly status: 'loaded'; readonly exclusions: readonly Exclusion[] };

/** The Admin's last addition, as the page tells it. */
export type Addition =
  | { readonly status: 'adding' }
  | { readonly status: 'added'; readonly exclusion: Exclusion }
  | { readonly status: 'failed' };

/** The Admin's last removal, as the page tells it. */
export interface ExclusionRemoval {
  readonly exclusion: Exclusion;
  readonly status: 'removing' | 'removed' | 'failed';
}

/** Both Members chosen: the page asks the API for an Exclusion between them. */
export type NewExclusion = readonly [string, string];

/**
 * The Group's Exclusions, for its Admin only (ADR 0001): the pairs with a quiet "Quitar" each,
 * which removes at once, and "Añadir exclusión", which opens an inline form with two selects in
 * place (#27, option B). A finished Group's Exclusions are only listed.
 */
@Component({
  selector: 'app-exclusions-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, Field, ReactiveFormsModule, TextLink, LucideArrowLeftRight, LucidePlus],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-exclusions" class="rounded-card bg-surface p-5 shadow-card">
      <h2
        id="group-exclusions"
        tabindex="-1"
        class="font-display text-lg font-semibold focus:outline-none"
      >
        Exclusiones{{ count() === null ? '' : ' (' + count() + ')' }}
      </h2>
      <p class="mt-1.5 text-ink-muted">
        Estas parejas nunca se tocarán en el sorteo. Solo tú las ves.
      </p>

      <p role="status" class="mt-1.5 text-sm text-ink-muted empty:hidden">{{ statusText() }}</p>

      @switch (listing().status) {
        @case ('loading') {
          <p class="mt-3 text-ink-muted">Cargando…</p>
        }
        @case ('failed') {
          <p appAlert class="mt-3">No hemos podido cargar las exclusiones. Inténtalo de nuevo.</p>
          <button type="button" appButton="secondary" class="mt-4" (click)="retry.emit()">
            Reintentar
          </button>
        }
        @case ('loaded') {
          @if (removal(); as removal) {
            @if (removal.status === 'failed') {
              <p appAlert class="mt-3">
                No hemos podido quitar la exclusión entre {{ pair(removal.exclusion) }}. Inténtalo
                de nuevo.
              </p>
            }
          }

          @if (exclusions().length === 0) {
            <p class="mt-3">Aún no hay exclusiones.</p>
          }
          <ul aria-label="Exclusiones" class="mt-3 flex flex-col gap-3 empty:hidden">
            @for (exclusion of exclusions(); track exclusion.id) {
              <li class="flex items-center gap-3">
                <span class="flex min-w-0 flex-wrap items-center gap-x-2 break-words">
                  <span>{{ exclusion.members[0].displayName }}</span>
                  <svg lucideArrowLeftRight [size]="18" class="shrink-0 text-ink-muted"></svg>
                  <span class="sr-only">y</span>
                  <span>{{ exclusion.members[1].displayName }}</span>
                </span>
                @if (!finished()) {
                  <button
                    type="button"
                    appLink
                    standalone
                    class="ml-auto shrink-0"
                    [attr.aria-label]="'Quitar la exclusión entre ' + pair(exclusion)"
                    [disabled]="isRemoving(exclusion)"
                    (click)="removeNow(exclusion)"
                  >
                    {{ isRemoving(exclusion) ? 'Quitando…' : 'Quitar' }}
                  </button>
                }
              </li>
            }
          </ul>

          @if (!finished()) {
            @if (members().length < 2) {
              <p class="mt-3 text-sm text-ink-muted">
                Cuando haya al menos dos personas en el grupo, podrás añadir exclusiones.
              </p>
            } @else if (adding()) {
              <form
                class="mt-4 flex flex-col gap-4 rounded-field bg-canvas p-4"
                [formGroup]="form"
                (ngSubmit)="submit()"
                novalidate
              >
                <div class="flex flex-col gap-1.5">
                  <label for="exclusion-one" class="font-bold">Una persona</label>
                  <select
                    id="exclusion-one"
                    formControlName="one"
                    appField
                    [attr.aria-invalid]="showsError(form.controls.one) || null"
                    [attr.aria-describedby]="
                      showsError(form.controls.one) ? 'exclusion-one-error' : null
                    "
                  >
                    <option value="">Elige…</option>
                    @for (member of members(); track member.id) {
                      <option [value]="member.id">{{ member.displayName }}</option>
                    }
                  </select>
                  @if (showsError(form.controls.one)) {
                    <p id="exclusion-one-error" class="text-sm font-semibold text-danger">
                      Elige a una persona.
                    </p>
                  }
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="exclusion-other" class="font-bold">Y otra</label>
                  <select
                    id="exclusion-other"
                    formControlName="other"
                    appField
                    [attr.aria-invalid]="otherShowsError() || null"
                    [attr.aria-describedby]="otherShowsError() ? 'exclusion-other-error' : null"
                  >
                    <option value="">Elige…</option>
                    @for (member of members(); track member.id) {
                      <option [value]="member.id">{{ member.displayName }}</option>
                    }
                  </select>
                  @if (otherShowsError()) {
                    <p id="exclusion-other-error" class="text-sm font-semibold text-danger">
                      @if (form.hasError('sameMember')) {
                        Elige a alguien distinto de la primera persona.
                      } @else {
                        Elige a otra persona.
                      }
                    </p>
                  }
                </div>
                @if (submitted() && addition()?.status === 'failed') {
                  <p appAlert>
                    No hemos podido añadir la exclusión. Puede que el grupo haya cambiado: recarga
                    la página e inténtalo de nuevo.
                  </p>
                }
                <div class="flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    appButton="secondary"
                    [disabled]="addition()?.status === 'adding'"
                  >
                    {{ addition()?.status === 'adding' ? 'Añadiendo…' : 'Añadir' }}
                  </button>
                  <button type="button" appLink standalone (click)="close()">Cancelar</button>
                </div>
              </form>
            } @else {
              <button
                id="add-exclusion"
                type="button"
                appLink
                standalone
                class="mt-3 gap-1"
                (click)="open()"
              >
                <svg lucidePlus [size]="18"></svg>
                Añadir exclusión
              </button>
            }
          }
        }
      }
    </section>
  `,
})
export class ExclusionsCard {
  /** Everyone in the Group, the Admin included: any two of them can be excluded. */
  readonly members = input.required<readonly Member[]>();
  readonly listing = input.required<ExclusionsListing>();
  /** A finished Group is read-only: its Exclusions are only listed. */
  readonly finished = input.required<boolean>();
  readonly addition = input<Addition | null>(null);
  readonly removal = input<ExclusionRemoval | null>(null);
  readonly add = output<NewExclusion>();
  readonly remove = output<Exclusion>();
  readonly retry = output();

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly adding = signal(false);
  protected readonly submitted = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group(
    { one: ['', Validators.required], other: ['', Validators.required] },
    { validators: differentMembers },
  );
  protected readonly exclusions = computed(() => {
    const listing = this.listing();
    return listing.status === 'loaded' ? listing.exclusions : [];
  });
  protected readonly count = computed(() =>
    this.listing().status === 'loaded' ? this.exclusions().length : null,
  );

  constructor() {
    effect(() => {
      if (this.addition()?.status === 'added' && untracked(this.adding)) {
        this.close();
      }
    });
  }

  protected statusText(): string {
    const removal = this.removal();
    if (removal?.status === 'removed') {
      return `Ya no hay exclusión entre ${this.pair(removal.exclusion)}.`;
    }
    const addition = this.addition();
    return addition?.status === 'added'
      ? `${this.pair(addition.exclusion)} nunca se tocarán en el sorteo.`
      : '';
  }

  protected pair(exclusion: Exclusion): string {
    return exclusion.members.map((member) => member.displayName).join(' y ');
  }

  protected isRemoving(exclusion: Exclusion): boolean {
    const removal = this.removal();
    return removal?.status === 'removing' && removal.exclusion.id === exclusion.id;
  }

  protected showsError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  /** The same Member twice is pointed out as soon as it is chosen. */
  protected otherShowsError(): boolean {
    return this.showsError(this.form.controls.other) || this.form.hasError('sameMember');
  }

  protected open(): void {
    this.form.reset();
    this.submitted.set(false);
    this.adding.set(true);
    this.focusOnceRendered('exclusion-one');
  }

  protected close(): void {
    this.adding.set(false);
    this.focusOnceRendered('add-exclusion');
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.addition()?.status === 'adding') {
      return;
    }
    const { one, other } = this.form.getRawValue();
    this.add.emit([one, other]);
  }

  /** Its row is about to go, so focus moves to the section's heading. */
  protected removeNow(exclusion: Exclusion): void {
    this.document.getElementById('group-exclusions')?.focus();
    this.remove.emit(exclusion);
  }

  private focusOnceRendered(id: string): void {
    afterNextRender(() => this.document.getElementById(id)?.focus(), { injector: this.injector });
  }
}

function differentMembers(group: AbstractControl): ValidationErrors | null {
  const { one, other } = group.value as { one: string; other: string };
  return one !== '' && one === other ? { sameMember: true } : null;
}

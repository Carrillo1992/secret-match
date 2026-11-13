import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
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
  Validators,
} from '@angular/forms';
import { LucideCalendar, LucideCheck, LucideWallet } from '@lucide/angular';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import {
  budgetInEuros,
  budgetText,
  groupDetailsInput,
  NAME_MAX_LENGTH,
  notBefore,
} from '../../data-access/group-details-form';
import { notBlank } from '../../../../shared/forms/validators';
import { euros } from '../../../../shared/format/euros';
import { earliestExchangeDate, longExchangeDate } from '../../data-access/group-format';
import { Group, GroupEdit } from '../../data-access/groups-api';

/** Where the Admin's last edit stands, as the page tells it. */
export type EditStatus = 'idle' | 'saving' | 'saved' | 'exchange-date-not-in-future' | 'failed';

/**
 * The Group's Exchange Date and budget. The Admin gets a quiet "Editar" that turns the card into a
 * form for the name, the Exchange Date and the budget; it closes once the page reports `saved`.
 * Chosen on #23 (option A). An alert about the last save shows only once this opening of the form
 * has been sent, so reopening it starts clean. A finished Group is read-only, so nobody gets
 * "Editar" there (#25).
 */
@Component({
  selector: 'app-group-details-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    Button,
    Field,
    ReactiveFormsModule,
    TextLink,
    LucideCalendar,
    LucideCheck,
    LucideWallet,
  ],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-details" class="rounded-card bg-surface p-5 shadow-card">
      @if (editing()) {
        <h2 id="group-details" class="font-display text-lg font-semibold">Editar grupo</h2>

        <form class="mt-4 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="flex flex-col gap-1.5">
            <label for="edit-group-name" class="font-bold">Nombre</label>
            <input
              id="edit-group-name"
              type="text"
              formControlName="name"
              autocomplete="off"
              [attr.maxlength]="nameMaxLength"
              appField
              [attr.aria-invalid]="showsError(form.controls.name) || null"
              [attr.aria-describedby]="
                showsError(form.controls.name) ? 'edit-group-name-error' : null
              "
            />
            @if (showsError(form.controls.name)) {
              <p id="edit-group-name-error" class="text-sm font-semibold text-danger">
                @if (form.controls.name.hasError('maxlength')) {
                  El nombre puede tener como mucho {{ nameMaxLength }} caracteres.
                } @else {
                  Escribe un nombre para el grupo.
                }
              </p>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="edit-group-date" class="font-bold">Fecha del intercambio</label>
            <input
              id="edit-group-date"
              type="date"
              formControlName="exchangeDate"
              [min]="earliestDate()"
              appField
              [attr.aria-invalid]="showsError(form.controls.exchangeDate) || null"
              [attr.aria-describedby]="
                showsError(form.controls.exchangeDate) ? 'edit-group-date-error' : null
              "
            />
            @if (showsError(form.controls.exchangeDate)) {
              <p id="edit-group-date-error" class="text-sm font-semibold text-danger">
                @if (form.controls.exchangeDate.hasError('notInFuture')) {
                  Elige una fecha a partir de mañana.
                } @else {
                  Elige la fecha del intercambio.
                }
              </p>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="edit-group-budget" class="font-bold">
              Presupuesto <span class="font-normal text-ink-muted">(opcional)</span>
            </label>
            <div class="relative">
              <input
                id="edit-group-budget"
                type="text"
                inputmode="decimal"
                formControlName="budget"
                autocomplete="off"
                appField
                class="w-full pr-10"
                [attr.aria-invalid]="showsError(form.controls.budget) || null"
                [attr.aria-describedby]="
                  showsError(form.controls.budget)
                    ? 'edit-group-budget-error'
                    : 'edit-group-budget-hint'
                "
              />
              <span
                aria-hidden="true"
                class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-muted"
                >€</span
              >
            </div>
            @if (showsError(form.controls.budget)) {
              <p id="edit-group-budget-error" class="text-sm font-semibold text-danger">
                Escribe una cantidad en euros, por ejemplo 25 o 25,50.
              </p>
            } @else {
              <p id="edit-group-budget-hint" class="text-sm text-ink-muted">
                Orientativo, en euros por regalo. Déjalo vacío para quitarlo.
              </p>
            }
          </div>

          <p class="text-sm text-ink-muted">
            Los miembros verán el cambio en esta página; no les avisamos por email.
          </p>

          @if (submitted() && status() === 'exchange-date-not-in-future') {
            <p appAlert>La fecha del intercambio tiene que ser a partir de mañana.</p>
          } @else if (submitted() && status() === 'failed') {
            <p appAlert>No hemos podido guardar los cambios. Inténtalo de nuevo en un momento.</p>
          }

          <button type="submit" appButton class="w-full" [disabled]="status() === 'saving'">
            <svg lucideCheck [size]="20"></svg>
            {{ status() === 'saving' ? 'Guardando…' : 'Guardar cambios' }}
          </button>
          <button type="button" appLink standalone class="self-center" (click)="cancel()">
            Cancelar
          </button>
        </form>
      } @else {
        <div class="flex items-center justify-between gap-3">
          <h2 id="group-details" class="font-display text-lg font-semibold">Datos del grupo</h2>
          @if (group().admin && !group().finished) {
            <button id="edit-group" type="button" appLink standalone (click)="open()">
              Editar
            </button>
          }
        </div>

        <dl class="mt-3 flex flex-col gap-4">
          <div class="flex gap-3">
            <svg lucideCalendar [size]="20" class="mt-0.5 shrink-0 text-ink-muted"></svg>
            <div>
              <dt class="font-bold">Fecha del intercambio</dt>
              <dd class="text-ink-muted">
                <time [attr.datetime]="group().exchangeDate">{{ date(group().exchangeDate) }}</time>
              </dd>
            </div>
          </div>
          <div class="flex gap-3">
            <svg lucideWallet [size]="20" class="mt-0.5 shrink-0 text-ink-muted"></svg>
            <div>
              <dt class="font-bold">Presupuesto</dt>
              <dd class="text-ink-muted">
                @if (group().budget !== undefined) {
                  {{ euros(group().budget ?? 0) }} por regalo
                } @else {
                  Sin presupuesto
                }
              </dd>
            </div>
          </div>
        </dl>
      }
    </section>
  `,
})
export class GroupDetailsCard {
  readonly group = input.required<Group>();
  readonly status = input<EditStatus>('idle');
  /** The Admin sent the form: the page asks the API to replace the Group's details. */
  readonly save = output<GroupEdit>();

  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly date = longExchangeDate;
  protected readonly euros = euros;

  protected readonly editing = signal(false);
  protected readonly submitted = signal(false);
  /** Tomorrow, unless the Group's current date is earlier: keeping it is allowed. */
  protected readonly earliestDate = signal('');

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(NAME_MAX_LENGTH)]],
    exchangeDate: [''],
    budget: ['', budgetInEuros],
  });

  constructor() {
    effect(() => {
      if (this.status() === 'saved' && untracked(this.editing)) {
        this.close();
      }
    });
  }

  protected showsError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  protected open(): void {
    const group = this.group();
    const tomorrow = earliestExchangeDate();
    this.earliestDate.set(group.exchangeDate < tomorrow ? group.exchangeDate : tomorrow);
    this.form.controls.exchangeDate.setValidators([
      Validators.required,
      notBefore(tomorrow, group.exchangeDate),
    ]);
    this.form.reset({
      name: group.name,
      exchangeDate: group.exchangeDate,
      budget: budgetText(group.budget),
    });
    this.submitted.set(false);
    this.editing.set(true);
    this.focusOnceRendered('edit-group-name');
  }

  protected cancel(): void {
    this.close();
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.status() === 'saving') {
      return;
    }
    this.save.emit(groupDetailsInput(this.form.getRawValue()));
  }

  private close(): void {
    this.editing.set(false);
    this.focusOnceRendered('edit-group');
  }

  private focusOnceRendered(id: string): void {
    afterNextRender(() => this.document.getElementById(id)?.focus(), { injector: this.injector });
  }
}

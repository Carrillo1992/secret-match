import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { notBlank } from '../../../../shared/forms/validators';
import { Alert } from '../../../../shared/ui/alert/alert';
import { Button } from '../../../../shared/ui/button/button';
import { Field } from '../../../../shared/ui/field/field';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import {
  httpLink,
  LINK_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  priceInEuros,
  PRIORITY_LABELS,
  TITLE_MAX_LENGTH,
  wishFormValue,
  wishInput,
} from '../../data-access/wish-rules';
import { Wish, WishInput, WishPriority } from '../../data-access/wishlist-api';

/** How the page's last save of this form went. */
export type SaveStatus = 'idle' | 'saving' | 'invalid-link' | 'failed';

/**
 * The inline form that adds a Wish, or edits one in place (#32, option A): title, link, price,
 * priority and notes in a `bg-canvas` well, then a secondary submit button and "Cancelar". Focus
 * moves to the title when it opens; the host closes it and puts focus back.
 */
@Component({
  selector: 'app-wish-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Button, Field, ReactiveFormsModule, TextLink],
  host: { class: 'block' },
  template: `
    <form
      class="flex flex-col gap-4 rounded-field bg-canvas p-4"
      [attr.aria-label]="wish() ? 'Editar ' + wish()?.title : 'Nuevo deseo'"
      [formGroup]="form"
      (ngSubmit)="submit()"
      novalidate
    >
      <div class="flex flex-col gap-1.5">
        <label [for]="id('title')" class="font-bold">Qué te gustaría</label>
        <input
          [id]="id('title')"
          type="text"
          formControlName="title"
          autocomplete="off"
          appField
          [attr.aria-invalid]="showsError(form.controls.title) || null"
          [attr.aria-describedby]="showsError(form.controls.title) ? id('title-error') : null"
        />
        @if (showsError(form.controls.title)) {
          <p [id]="id('title-error')" class="text-sm font-semibold text-danger">
            @if (form.controls.title.hasError('required')) {
              Escribe qué te gustaría.
            } @else {
              Usa como mucho {{ titleMax }} caracteres.
            }
          </p>
        }
      </div>

      <div class="flex flex-col gap-1.5">
        <label [for]="id('link')" class="font-bold">
          Enlace <span class="font-normal text-ink-muted">(opcional)</span>
        </label>
        <input
          [id]="id('link')"
          type="url"
          inputmode="url"
          formControlName="link"
          autocomplete="off"
          placeholder="https://"
          appField
          [attr.aria-invalid]="linkShowsError() || null"
          [attr.aria-describedby]="linkShowsError() ? id('link-error') : null"
        />
        @if (linkShowsError()) {
          <p [id]="id('link-error')" class="text-sm font-semibold text-danger">
            @if (form.controls.link.hasError('maxlength')) {
              El enlace es demasiado largo.
            } @else {
              Pega una dirección web que empiece por http:// o https://.
            }
          </p>
        }
      </div>

      <div class="flex flex-col gap-1.5">
        <label [for]="id('price')" class="font-bold">
          Precio aproximado <span class="font-normal text-ink-muted">(opcional)</span>
        </label>
        <div class="relative">
          <input
            [id]="id('price')"
            type="text"
            inputmode="decimal"
            formControlName="price"
            autocomplete="off"
            appField
            class="w-full pr-10"
            [attr.aria-invalid]="showsError(form.controls.price) || null"
            [attr.aria-describedby]="showsError(form.controls.price) ? id('price-error') : null"
          />
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-muted"
            >€</span
          >
        </div>
        @if (showsError(form.controls.price)) {
          <p [id]="id('price-error')" class="text-sm font-semibold text-danger">
            Escribe una cantidad en euros, por ejemplo 25 o 25,50.
          </p>
        }
      </div>

      <div class="flex flex-col gap-1.5">
        <label [for]="id('priority')" class="font-bold">Prioridad</label>
        <select [id]="id('priority')" formControlName="priority" appField>
          @for (priority of priorities; track priority) {
            <option [value]="priority">{{ priorityLabels[priority] }}</option>
          }
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label [for]="id('notes')" class="font-bold">
          Notas <span class="font-normal text-ink-muted">(opcional)</span>
        </label>
        <textarea
          [id]="id('notes')"
          rows="3"
          formControlName="notes"
          appField
          [attr.aria-invalid]="showsError(form.controls.notes) || null"
          [attr.aria-describedby]="
            showsError(form.controls.notes) ? id('notes-error') : id('notes-hint')
          "
        ></textarea>
        @if (showsError(form.controls.notes)) {
          <p [id]="id('notes-error')" class="text-sm font-semibold text-danger">
            Usa como mucho {{ notesMax }} caracteres.
          </p>
        } @else {
          <p [id]="id('notes-hint')" class="text-sm text-ink-muted">
            Talla, color, modelo… lo que ayude a acertar.
          </p>
        }
      </div>

      @if (submitted() && status() === 'failed') {
        <p appAlert>No hemos podido guardar el deseo. Inténtalo de nuevo en un momento.</p>
      }

      <div class="flex flex-wrap items-center gap-4">
        <button type="submit" appButton="secondary" [disabled]="status() === 'saving'">
          {{ status() === 'saving' ? 'Guardando…' : wish() ? 'Guardar' : 'Añadir' }}
        </button>
        <button type="button" appLink standalone (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
})
export class WishForm implements OnInit {
  /** The Wish being edited; none to add a new one. */
  readonly wish = input<Wish>();
  readonly status = input<SaveStatus>('idle');
  /** Keeps the ids of each open form apart: one may add while another edits. */
  readonly idPrefix = input.required<string>();
  readonly save = output<WishInput>();
  readonly cancelled = output();

  private readonly document = inject(DOCUMENT);

  protected readonly titleMax = TITLE_MAX_LENGTH;
  protected readonly notesMax = NOTES_MAX_LENGTH;
  protected readonly priorities: readonly WishPriority[] = ['HIGH', 'MEDIUM', 'LOW'];
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly submitted = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [notBlank, Validators.maxLength(TITLE_MAX_LENGTH)]],
    link: ['', [httpLink, Validators.maxLength(LINK_MAX_LENGTH)]],
    price: ['', priceInEuros],
    notes: ['', Validators.maxLength(NOTES_MAX_LENGTH)],
    priority: ['MEDIUM' as WishPriority],
  });

  constructor() {
    afterNextRender(() => this.document.getElementById(this.id('title'))?.focus());
  }

  ngOnInit(): void {
    this.form.setValue(wishFormValue(this.wish()));
  }

  protected id(field: string): string {
    return `${this.idPrefix()}-${field}`;
  }

  protected showsError(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  /** The API refusing the link is shown on the field, like the form's own check. */
  protected linkShowsError(): boolean {
    return this.showsError(this.form.controls.link) || this.status() === 'invalid-link';
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.status() === 'saving') {
      return;
    }
    this.save.emit(wishInput(this.form.getRawValue()));
  }
}

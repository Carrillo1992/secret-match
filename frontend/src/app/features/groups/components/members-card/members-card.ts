import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { Chip } from '../../../../shared/ui/chip/chip';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { Group } from '../../data-access/groups-api';

export type Member = Group['members'][number];

/** The Admin's last removal, as the page tells it. */
export interface Removal {
  readonly member: Member;
  readonly status: 'removing' | 'removed' | 'failed';
}

/**
 * Who is in the Group, the Admin first. The Admin gets a quiet "Quitar" on every other Member,
 * behind an inline confirmation under that Member's row.
 */
@Component({
  selector: 'app-members-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Chip, TextLink],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-members" class="rounded-card bg-surface p-5 shadow-card">
      <h2
        #heading
        id="group-members"
        tabindex="-1"
        class="font-display text-lg font-semibold focus:outline-none"
      >
        Miembros ({{ members().length }})
      </h2>

      <p role="status" class="text-sm text-ink-muted empty:hidden mt-1.5">{{ statusText() }}</p>

      @if (removal(); as removal) {
        @if (removal.status === 'failed') {
          <p
            role="alert"
            class="mt-3 rounded-field bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          >
            No hemos podido quitar a {{ removal.member.displayName }}. Inténtalo de nuevo.
          </p>
        }
      }

      <ul aria-label="Miembros" class="mt-3 flex flex-col gap-3">
        @for (member of members(); track member.id) {
          <li>
            <div class="flex items-center gap-3">
              <span
                aria-hidden="true"
                class="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle font-display font-bold"
                >{{ initial(member.displayName) }}</span
              >
              <span class="min-w-0 break-words">{{ member.displayName }}</span>
              @if (member.admin) {
                <span appChip>Admin</span>
              }
              @if (canRemove() && !member.admin && confirming()?.id !== member.id) {
                <button
                  #removeButton
                  type="button"
                  appLink
                  standalone
                  class="ml-auto shrink-0"
                  [attr.data-member]="member.id"
                  [attr.aria-label]="'Quitar a ' + member.displayName"
                  [disabled]="isRemoving(member)"
                  (click)="startConfirming(member)"
                >
                  {{ isRemoving(member) ? 'Quitando…' : 'Quitar' }}
                </button>
              }
            </div>
            @if (confirming()?.id === member.id) {
              <div class="mt-3 rounded-field bg-canvas p-4">
                <p class="font-bold break-words">¿Quitar a {{ member.displayName }}?</p>
                <p class="mt-1.5 text-sm text-ink-muted">
                  Dejará de ver el grupo. Le avisaremos por email.
                </p>
                <div class="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    #confirmButton
                    type="button"
                    appButton="secondary"
                    (click)="confirm(member)"
                  >
                    Sí, quitar
                  </button>
                  <button type="button" appLink standalone (click)="cancel(member)">
                    Cancelar
                  </button>
                </div>
              </div>
            }
          </li>
        }
      </ul>
    </section>
  `,
})
export class MembersCard {
  readonly members = input.required<readonly Member[]>();
  /** Whether the Member looking is the Admin, who alone can remove others. */
  readonly canRemove = input.required<boolean>();
  readonly removal = input<Removal | null>(null);
  /** The Admin confirmed: the page asks the API to remove this Member. */
  readonly remove = output<Member>();

  protected readonly confirming = signal<Member | null>(null);
  private readonly injector = inject(Injector);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');
  private readonly removeButtons = viewChildren<ElementRef<HTMLButtonElement>>('removeButton');

  protected statusText(): string {
    const removal = this.removal();
    return removal?.status === 'removed'
      ? `${removal.member.displayName} ya no está en el grupo.`
      : '';
  }

  protected isRemoving(member: Member): boolean {
    const removal = this.removal();
    return removal?.status === 'removing' && removal.member.id === member.id;
  }

  protected initial(displayName: string): string {
    return displayName.charAt(0).toLocaleUpperCase('es-ES');
  }

  /** The button that opened the confirmation disappears, so keyboard focus moves into it. */
  protected startConfirming(member: Member): void {
    this.confirming.set(member);
    this.focusAfterRender(() => this.confirmButton()?.nativeElement);
  }

  protected cancel(member: Member): void {
    this.confirming.set(null);
    this.focusAfterRender(() => this.removeButtonOf(member));
  }

  /** The row may be about to disappear, so focus goes to the list's heading. */
  protected confirm(member: Member): void {
    this.confirming.set(null);
    this.remove.emit(member);
    this.focusAfterRender(() => this.heading().nativeElement);
  }

  private removeButtonOf(member: Member): HTMLButtonElement | undefined {
    return this.removeButtons()
      .map((button) => button.nativeElement)
      .find((button) => button.dataset['member'] === member.id);
  }

  private focusAfterRender(target: () => HTMLElement | undefined): void {
    afterNextRender(() => target()?.focus(), { injector: this.injector });
  }
}

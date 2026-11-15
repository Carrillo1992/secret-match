import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ConfirmPanel } from '../../../../shared/ui/confirm-panel/confirm-panel';
import { Chip } from '../../../../shared/ui/chip/chip';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { Group } from '../../data-access/groups-api';
import { intlLocale } from '../../../../core/language';
import { Alert } from '../../../../shared/ui/alert/alert';

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
  imports: [Alert, Chip, ConfirmPanel, TextLink],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-members" class="rounded-card bg-surface p-5 shadow-card">
      <h2
        id="group-members"
        tabindex="-1"
        class="font-display text-lg font-semibold focus:outline-none"
        i18n
      >
        Miembros ({{ members().length }})
      </h2>

      <p role="status" class="text-sm text-ink-muted empty:hidden mt-1.5">{{ statusText() }}</p>

      @if (removal(); as removal) {
        @if (removal.status === 'failed') {
          <p appAlert class="mt-3" i18n>
            No hemos podido quitar a {{ removal.member.displayName }}. Inténtalo de nuevo.
          </p>
        }
      }

      <ul aria-label="Miembros" i18n-aria-label class="mt-3 flex flex-col gap-3">
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
                  [id]="'remove-' + member.id"
                  type="button"
                  appLink
                  standalone
                  class="ml-auto shrink-0"
                  [attr.aria-label]="removeLabel(member)"
                  [disabled]="isRemoving(member)"
                  (click)="confirming.set(member)"
                >
                  @if (isRemoving(member)) {
                    <ng-container i18n>Quitando…</ng-container>
                  } @else {
                    <ng-container i18n>Quitar</ng-container>
                  }
                </button>
              }
            </div>
            @if (confirming()?.id === member.id) {
              <app-confirm-panel
                class="mt-3"
                [question]="removeQuestion(member)"
                confirmLabel="Sí, quitar"
                i18n-confirmLabel
                [returnFocusTo]="'remove-' + member.id"
                focusAfterConfirm="group-members"
                (confirmed)="confirm(member)"
                (cancelled)="confirming.set(null)"
              >
                <ng-container i18n>Dejará de ver el grupo. Le avisaremos por email.</ng-container>
              </app-confirm-panel>
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

  protected statusText(): string {
    const removal = this.removal();
    return removal?.status === 'removed'
      ? $localize`${removal.member.displayName}:name: ya no está en el grupo.`
      : '';
  }

  protected removeLabel(member: Member): string {
    return $localize`Quitar a ${member.displayName}:name:`;
  }

  protected removeQuestion(member: Member): string {
    return $localize`¿Quitar a ${member.displayName}:name:?`;
  }

  protected isRemoving(member: Member): boolean {
    const removal = this.removal();
    return removal?.status === 'removing' && removal.member.id === member.id;
  }

  protected initial(displayName: string): string {
    return displayName.charAt(0).toLocaleUpperCase(intlLocale());
  }

  /** The row may be about to disappear, so the panel moves focus to the list's heading. */
  protected confirm(member: Member): void {
    this.confirming.set(null);
    this.remove.emit(member);
  }
}

import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight } from '@lucide/angular';
import { ConfirmPanel } from '../../../../shared/ui/confirm-panel/confirm-panel';
import { Chip } from '../../../../shared/ui/chip/chip';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { Group } from '../../data-access/groups-api';
import { Alert } from '../../../../shared/ui/alert/alert';

export type Member = Group['members'][number];

/** The Admin's last removal, as the page tells it. */
export interface Removal {
  readonly member: Member;
  readonly status: 'removing' | 'removed' | 'failed';
}

/**
 * Who is in the Group, the Admin first. Every row links to that Member's Wishlist (#32). The Admin
 * gets a quiet "Quitar" on every other Member, behind an inline confirmation under that Member's row.
 */
@Component({
  selector: 'app-members-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Alert, Chip, ConfirmPanel, RouterLink, TextLink, LucideChevronRight],
  host: { class: 'block' },
  template: `
    <section aria-labelledby="group-members" class="rounded-card bg-surface p-5 shadow-card">
      <h2
        id="group-members"
        tabindex="-1"
        class="font-display text-lg font-semibold focus:outline-none"
      >
        Miembros ({{ members().length }})
      </h2>

      <p role="status" class="text-sm text-ink-muted empty:hidden mt-1.5">{{ statusText() }}</p>

      @if (removal(); as removal) {
        @if (removal.status === 'failed') {
          <p appAlert class="mt-3">
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
              <a
                [routerLink]="['members', member.id, 'wishlist']"
                appLink
                standalone
                class="ml-auto shrink-0 gap-0.5"
                [attr.aria-label]="member.you ? 'Tus deseos' : 'Deseos de ' + member.displayName"
              >
                Deseos
                <svg lucideChevronRight [size]="18"></svg>
              </a>
              @if (canRemove() && !member.admin && confirming()?.id !== member.id) {
                <button
                  [id]="'remove-' + member.id"
                  type="button"
                  appLink
                  standalone
                  class="shrink-0"
                  [attr.aria-label]="'Quitar a ' + member.displayName"
                  [disabled]="isRemoving(member)"
                  (click)="confirming.set(member)"
                >
                  {{ isRemoving(member) ? 'Quitando…' : 'Quitar' }}
                </button>
              }
            </div>
            @if (confirming()?.id === member.id) {
              <app-confirm-panel
                class="mt-3"
                [question]="'¿Quitar a ' + member.displayName + '?'"
                confirmLabel="Sí, quitar"
                [returnFocusTo]="'remove-' + member.id"
                focusAfterConfirm="group-members"
                (confirmed)="confirm(member)"
                (cancelled)="confirming.set(null)"
              >
                Dejará de ver el grupo. Le avisaremos por email.
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

  /** The row may be about to disappear, so the panel moves focus to the list's heading. */
  protected confirm(member: Member): void {
    this.confirming.set(null);
    this.remove.emit(member);
  }
}

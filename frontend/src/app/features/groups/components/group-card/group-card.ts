import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCalendar, LucideChevronRight } from '@lucide/angular';
import { Chip } from '../../../../shared/ui/chip/chip';
import { euros, memberCount, shortExchangeDate } from '../../data-access/group-format';
import { GroupSummary } from '../../data-access/groups-api';

/** One of the User's Groups in "Mis grupos": the whole card links to the Group's page. */
@Component({
  selector: 'app-group-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Chip, LucideCalendar, LucideChevronRight],
  host: { class: 'block' },
  template: `
    <a
      [routerLink]="['/groups', group().id]"
      class="flex items-center gap-4 rounded-card bg-surface p-5 text-ink shadow-card transition-shadow duration-200 hover:shadow-sheet focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div class="min-w-0 flex-1">
        <h2 class="font-display text-lg font-semibold break-words">{{ group().name }}</h2>
        <p class="mt-1 flex items-center gap-1.5 text-ink-muted">
          <svg lucideCalendar [size]="16"></svg>
          <time [attr.datetime]="group().exchangeDate">{{ date() }}</time>
        </p>
        <ul class="mt-3 flex flex-wrap gap-2">
          @if (group().admin) {
            <li appChip>Admin</li>
          }
          <li appChip>{{ members() }}</li>
          @if (budget(); as budget) {
            <li appChip>{{ budget }}</li>
          }
        </ul>
      </div>
      <svg lucideChevronRight [size]="20" class="shrink-0 text-ink-muted"></svg>
    </a>
  `,
})
export class GroupCard {
  readonly group = input.required<GroupSummary>();

  protected readonly date = computed(() => shortExchangeDate(this.group().exchangeDate));
  protected readonly members = computed(() => memberCount(this.group().memberCount));
  protected readonly budget = computed(() => {
    const budget = this.group().budget;
    return budget === undefined ? null : euros(budget);
  });
}

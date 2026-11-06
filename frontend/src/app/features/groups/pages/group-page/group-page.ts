import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideCalendar, LucideChevronLeft, LucideSearchX, LucideWallet } from '@lucide/angular';
import { map } from 'rxjs';
import { AppShell } from '../../../../shared/ui/app-shell/app-shell';
import { Button } from '../../../../shared/ui/button/button';
import { Chip } from '../../../../shared/ui/chip/chip';
import { StatusHeader } from '../../../../shared/ui/status-header/status-header';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { euros, longExchangeDate } from '../../data-access/group-format';
import { GroupsApi } from '../../data-access/groups-api';

/** A Group as its Members see it: its details and who is in it. */
@Component({
  selector: 'app-group-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AppShell,
    Button,
    Chip,
    StatusHeader,
    TextLink,
    LucideCalendar,
    LucideChevronLeft,
    LucideSearchX,
    LucideWallet,
  ],
  templateUrl: './group-page.html',
})
export class GroupPage {
  private readonly groupsApi = inject(GroupsApi);
  private readonly groupId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('groupId') ?? '')),
    { requireSync: true },
  );

  private readonly outcome = resource({
    params: () => this.groupId(),
    loader: ({ params }) => this.groupsApi.group(params),
  });

  protected readonly isLoading = this.outcome.isLoading;
  /** The data-access layer never rejects: it reports `not-found` or `failed` instead. */
  private readonly result = computed(() =>
    this.outcome.hasValue() ? this.outcome.value() : undefined,
  );
  protected readonly group = computed(() => {
    const result = this.result();
    return result?.status === 'found' ? result.group : undefined;
  });
  protected readonly notFound = computed(() => this.result()?.status === 'not-found');

  protected readonly date = longExchangeDate;
  protected readonly euros = euros;

  protected reload(): void {
    this.outcome.reload();
  }

  protected initial(displayName: string): string {
    return displayName.charAt(0).toLocaleUpperCase('es-ES');
  }
}

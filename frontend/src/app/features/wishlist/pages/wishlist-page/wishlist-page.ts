import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  inject,
  Injector,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideChevronLeft, LucideExternalLink, LucidePlus, LucideSearchX } from '@lucide/angular';
import { map } from 'rxjs';
import { Alert } from '../../../../shared/ui/alert/alert';
import { AppShell } from '../../../../shared/ui/app-shell/app-shell';
import { Button } from '../../../../shared/ui/button/button';
import { Chip } from '../../../../shared/ui/chip/chip';
import { ConfirmPanel } from '../../../../shared/ui/confirm-panel/confirm-panel';
import { StatusHeader } from '../../../../shared/ui/status-header/status-header';
import { TextLink } from '../../../../shared/ui/text-link/text-link';
import { euros } from '../../../../shared/format/euros';
import { DontListCard } from '../../components/dont-list-card/dont-list-card';
import { PreferencesCard } from '../../components/preferences-card/preferences-card';
import { SaveStatus, WishForm } from '../../components/wish-form/wish-form';
import { PRIORITY_LABELS } from '../../data-access/wish-rules';
import {
  DontListEntry,
  Wish,
  WishInput,
  Wishlist,
  WishlistApi,
} from '../../data-access/wishlist-api';

/**
 * A Member's Wishlist in a Group (#32, option A). Private (ADR 0004): its owner reads and changes it
 * (adding Wishes through the inline form, editing one in place with the same form, deleting one
 * behind an inline confirmation), and once there is a Draw their Giver reads it, from the Draw card.
 * Under the Wishes come the Don't List and the Preferences (#33), each a card that saves its own
 * changes; the Giver reads them, and an empty one is hidden from them.
 */
@Component({
  selector: 'app-wishlist-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Alert,
    AppShell,
    Button,
    Chip,
    ConfirmPanel,
    DontListCard,
    PreferencesCard,
    RouterLink,
    StatusHeader,
    TextLink,
    WishForm,
    LucideChevronLeft,
    LucideExternalLink,
    LucidePlus,
    LucideSearchX,
  ],
  templateUrl: './wishlist-page.html',
})
export class WishlistPage {
  private readonly api = inject(WishlistApi);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  protected readonly params = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => ({
        groupId: params.get('groupId') ?? '',
        memberId: params.get('memberId') ?? '',
      })),
    ),
    { requireSync: true },
  );

  private readonly outcome = resource({
    params: () => this.params(),
    loader: ({ params }) => this.api.wishlist(params.groupId, params.memberId),
  });

  /** Reloading after a change keeps the list on screen: only the first load says "Cargando…". */
  protected readonly isLoading = computed(
    () => this.outcome.isLoading() && !this.outcome.hasValue(),
  );
  /** The data-access layer never rejects: it reports `not-found` or `failed` instead. */
  private readonly result = computed(() =>
    this.outcome.hasValue() ? this.outcome.value() : undefined,
  );
  protected readonly wishlist = computed(() => {
    const result = this.result();
    return result?.status === 'found' ? result.wishlist : undefined;
  });
  protected readonly notFound = computed(() => this.result()?.status === 'not-found');
  protected readonly groupLink = computed(() => `/groups/${this.params().groupId}`);

  protected readonly euros = euros;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected readonly adding = signal(false);
  protected readonly addStatus = signal<SaveStatus>('idle');
  protected readonly editing = signal<string | null>(null);
  protected readonly editStatus = signal<SaveStatus>('idle');
  protected readonly confirmingDelete = signal<string | null>(null);
  protected readonly deleting = signal<string | null>(null);
  protected readonly deleteFailed = signal<Wish | null>(null);
  /** What the owner's last change did, announced in the status line. */
  protected readonly statusText = signal('');

  protected reload(): void {
    this.outcome.reload();
  }

  protected openAdd(): void {
    this.closeEdit();
    this.addStatus.set('idle');
    this.adding.set(true);
  }

  protected closeAdd(): void {
    this.adding.set(false);
    this.focusOnceRendered('add-wish');
  }

  protected async add(wish: WishInput): Promise<void> {
    this.addStatus.set('saving');
    const outcome = await this.api.add(this.params().groupId, wish);
    if (outcome.status !== 'saved') {
      this.addStatus.set(outcome.status);
      return;
    }
    this.addStatus.set('idle');
    this.statusText.set(`«${outcome.wish.title}» está en tu lista.`);
    this.closeAdd();
    this.outcome.reload();
  }

  protected openEdit(wish: Wish): void {
    this.adding.set(false);
    this.confirmingDelete.set(null);
    this.editStatus.set('idle');
    this.editing.set(wish.id);
  }

  protected closeEdit(): void {
    const id = this.editing();
    this.editing.set(null);
    if (id) {
      this.focusOnceRendered(`edit-${id}`);
    }
  }

  protected async edit(wishId: string, wish: WishInput): Promise<void> {
    this.editStatus.set('saving');
    const outcome = await this.api.edit(this.params().groupId, wishId, wish);
    if (outcome.status !== 'saved') {
      this.editStatus.set(outcome.status);
      return;
    }
    this.editStatus.set('idle');
    this.statusText.set(`«${outcome.wish.title}» guardado.`);
    this.closeEdit();
    this.outcome.reload();
  }

  /** Its row is about to go, so the confirmation hands focus to the page title. */
  protected async delete(wish: Wish): Promise<void> {
    this.confirmingDelete.set(null);
    this.deleteFailed.set(null);
    this.deleting.set(wish.id);
    const outcome = await this.api.delete(this.params().groupId, wish.id);
    this.deleting.set(null);
    if (outcome.status === 'failed') {
      this.deleteFailed.set(wish);
      return;
    }
    this.statusText.set(`«${wish.title}» ya no está en tu lista.`);
    this.outcome.reload();
  }

  protected dontListChanged(dontList: readonly DontListEntry[]): void {
    this.changeWishlist({ dontList: [...dontList] });
  }

  protected preferencesChanged(preferences: string | undefined): void {
    this.changeWishlist({ preferences });
  }

  /** A card saved its part: the page keeps it without reloading the whole Wishlist. */
  private changeWishlist(change: Partial<Wishlist>): void {
    this.outcome.update((outcome) =>
      outcome?.status === 'found'
        ? { ...outcome, wishlist: { ...outcome.wishlist, ...change } }
        : outcome,
    );
  }

  private focusOnceRendered(id: string): void {
    afterNextRender(() => this.document.getElementById(id)?.focus(), { injector: this.injector });
  }
}

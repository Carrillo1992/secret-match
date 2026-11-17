import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  InjectionToken,
  Injector,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { Api } from '../api/generated/api';
import { publicKey, subscribe, unsubscribe } from '../api/generated/functions';
import { problemCode } from '../api/problem';
import { AuthSession } from '../auth/auth-session';
import { AppInstall } from '../install/app-install';

/**
 * Notifications on this device:
 * - `unsupported`: not offered here (no service worker or Push API, or the API sends none).
 * - `off` / `on`: whether this device gets them.
 * - `denied`: the browser blocks them for SecretMatch; only its site settings can change that.
 */
export type PushStatus = 'unsupported' | 'off' | 'on' | 'denied';

/** What came of turning notifications on or off. */
export type PushOutcome = 'on' | 'off' | 'denied' | 'failed';

/** What the browser offers for notifications. A dependency, so it can be stubbed in tests. */
export interface NotificationPlatform {
  supported(): boolean;
  permission(): NotificationPermission;
}

export const NOTIFICATION_PLATFORM = new InjectionToken<NotificationPlatform>(
  'NOTIFICATION_PLATFORM',
  {
    factory: () => {
      const window = inject(DOCUMENT).defaultView;
      return {
        supported: () => !!window && 'PushManager' in window && 'Notification' in window,
        permission: () => window?.Notification?.permission ?? 'default',
      };
    },
  },
);

/** The invitation's memory on this device: one "Ahora no" hides it for good. */
const INVITE_KEY = 'secretmatch.push-invite';

/**
 * Notifications on this device (Web Push, #119): whether they are offered and on, turning them
 * on and off, and keeping the API's list of this User's devices in step.
 *
 * They are offered to a signed-in User where the browser can take them, except on an iPhone or
 * iPad where SecretMatch is not installed (iOS only lets an installed app have them). The
 * invitation on the Group page shows until it is accepted or dismissed once ("Ahora no", kept in
 * `localStorage`; with storage blocked it never shows), and never while the install bar is up.
 *
 * A device belongs to whoever subscribed it last: on every sign-in an existing subscription is
 * handed to the API again. Signing out forgets it in the API and the browser; a session that ends
 * any other way (expired, revoked, account deleted) unsubscribes the browser, so the device stops
 * getting that account's notifications.
 */
@Injectable({ providedIn: 'root' })
export class DevicePush {
  private readonly api = inject(Api);
  /** Missing where no service worker is provided (specs); then nothing is offered. */
  private readonly swPush = inject(SwPush, { optional: true });
  private readonly platform = inject(NOTIFICATION_PLATFORM);
  private readonly session = inject(AuthSession);
  private readonly appInstall = inject(AppInstall);
  private readonly injector = inject(Injector);
  private readonly window = inject(DOCUMENT).defaultView;

  private readonly state = signal<PushStatus>('unsupported');
  private readonly serverKey = signal<string | null>(null);
  private readonly dismissed = signal(this.readDismissed());

  readonly status = this.state.asReadonly();

  /** Whether notifications are offered on this device right now, on or off. */
  readonly available = computed(
    () =>
      this.state() !== 'unsupported' &&
      this.session.isSignedIn() &&
      this.appInstall.way() !== 'guide',
  );

  /** Whether the Group page invites to turn them on. */
  readonly inviteVisible = computed(
    () =>
      this.available() &&
      this.state() === 'off' &&
      !this.dismissed() &&
      !this.appInstall.suggestionVisible(),
  );

  /** Checks this device on every sign-in, and listens for the session ending. Called once, as the app starts. */
  start(): void {
    if (!this.swPush?.isEnabled || !this.platform.supported()) {
      return;
    }
    this.session.ended
      .pipe(takeUntilDestroyed(this.injector.get(DestroyRef)))
      .subscribe(() => void this.unsubscribeBrowser());
    effect(
      () => {
        if (this.session.isSignedIn()) {
          untracked(() => void this.check());
        }
      },
      { injector: this.injector },
    );
  }

  /** Asks the browser for permission, if it has not been given, and subscribes this device. */
  async turnOn(): Promise<PushOutcome> {
    const key = this.serverKey();
    if (!key || !this.swPush) {
      return 'failed';
    }
    let subscription: PushSubscription;
    try {
      subscription = await this.swPush.requestSubscription({ serverPublicKey: key });
    } catch {
      // Blocked in the dialog, or closed without an answer.
      if (this.platform.permission() === 'denied') {
        this.state.set('denied');
        return 'denied';
      }
      return 'off';
    }
    try {
      await this.api.invoke(subscribe, { body: bodyOf(subscription) });
    } catch {
      // A subscription the API does not know would never get anything: undo it.
      await this.unsubscribeBrowser();
      return 'failed';
    }
    this.state.set('on');
    return 'on';
  }

  /** Stops notifications on this device: the API forgets it first, then the browser. */
  async turnOff(): Promise<PushOutcome> {
    const subscription = await this.currentSubscription();
    if (subscription) {
      try {
        await this.api.invoke(unsubscribe, { body: { endpoint: subscription.endpoint } });
      } catch {
        return 'failed';
      }
      await this.unsubscribeBrowser();
    }
    this.state.set('off');
    return 'off';
  }

  /**
   * Before signing out: the API forgets this device while the session still works, and the
   * browser drops its subscription. A failure is let go, so signing out still happens.
   */
  async forgetThisDevice(): Promise<void> {
    const subscription = await this.currentSubscription();
    if (!subscription) {
      return;
    }
    try {
      await this.api.invoke(unsubscribe, { body: { endpoint: subscription.endpoint } });
    } catch {
      // The browser's unsubscribe below makes the push service answer 410, and the API forgets it then.
    }
    await this.unsubscribeBrowser();
  }

  /** "Ahora no": no more invitations on this device. */
  dismissInvite(): void {
    this.dismissed.set(true);
    try {
      this.window?.localStorage.setItem(INVITE_KEY, 'dismissed');
    } catch {
      // Storage blocked: the invitation never shows without it anyway.
    }
  }

  /** Finds out whether this device can, does or may get notifications, and resyncs a subscription. */
  private async check(): Promise<void> {
    const key = await this.fetchServerKey();
    if (key === 'push-off') {
      this.state.set('unsupported');
      return;
    }
    if (key === 'unreachable') {
      // Nothing is known yet: offer nothing now, and ask again on the next sign-in.
      return;
    }
    if (this.platform.permission() === 'denied') {
      this.state.set('denied');
      return;
    }
    const subscription = await this.currentSubscription();
    if (!subscription) {
      this.state.set('off');
      return;
    }
    this.state.set('on');
    try {
      await this.api.invoke(subscribe, { body: bodyOf(subscription) });
    } catch {
      // Tried again on the next sign-in; until then the API keeps what it had.
    }
  }

  /** The API's VAPID key; `push-off` when it sends no notifications, `unreachable` when it can't say. */
  private async fetchServerKey(): Promise<string | 'push-off' | 'unreachable'> {
    const known = this.serverKey();
    if (known) {
      return known;
    }
    try {
      const { publicKey: key } = await this.api.invoke(publicKey);
      this.serverKey.set(key);
      return key;
    } catch (error) {
      return problemCode(error) === 'push-off' ? 'push-off' : 'unreachable';
    }
  }

  private async currentSubscription(): Promise<PushSubscription | null> {
    return this.swPush?.isEnabled ? firstValueFrom(this.swPush.subscription) : null;
  }

  private async unsubscribeBrowser(): Promise<void> {
    if (!(await this.currentSubscription())) {
      return;
    }
    try {
      await this.swPush?.unsubscribe();
    } catch {
      // Nothing to undo: the browser had already dropped it.
    }
    if (this.state() === 'on') {
      this.state.set('off');
    }
  }

  /** `true` when "Ahora no" was chosen on this device, or storage is blocked (so it never nags). */
  private readDismissed(): boolean {
    try {
      return this.window?.localStorage.getItem(INVITE_KEY) !== null;
    } catch {
      return true;
    }
  }
}

/** The subscription as the API takes it: its endpoint and the browser's keys. */
function bodyOf(subscription: PushSubscription) {
  const { endpoint, keys } = subscription.toJSON();
  return {
    endpoint: endpoint ?? subscription.endpoint,
    keys: { p256dh: keys?.['p256dh'] ?? '', auth: keys?.['auth'] ?? '' },
  };
}

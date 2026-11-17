import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { BehaviorSubject, Subject } from 'rxjs';
import { provideApiConfiguration } from '../api/generated/api-configuration';
import { AuthSession } from '../auth/auth-session';
import { AppInstall, InstallWay } from '../install/app-install';
import { DevicePush, NOTIFICATION_PLATFORM } from './device-push';

const API = 'http://api.test/api/v1';
const PUBLIC_KEY_URL = `${API}/push/public-key`;
const SUBSCRIPTIONS_URL = `${API}/push-subscriptions`;
const KEY =
  'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc';
const SUBSCRIPTION_JSON = {
  endpoint: ENDPOINT,
  keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
};

/** A browser's push subscription, as `SwPush` hands it over. */
function browserSubscription(): PushSubscription {
  return { endpoint: ENDPOINT, toJSON: () => SUBSCRIPTION_JSON } as unknown as PushSubscription;
}

describe('DevicePush', () => {
  let http: HttpTestingController;
  let swPush: {
    isEnabled: boolean;
    subscription: BehaviorSubject<PushSubscription | null>;
    requestSubscription: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  };
  let platform: { supported: boolean; permission: NotificationPermission };
  let signedIn: ReturnType<typeof signal<boolean>>;
  let sessionEnded: Subject<void>;
  let installWay: ReturnType<typeof signal<InstallWay>>;
  let installSuggestion: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    localStorage.clear();
    swPush = {
      isEnabled: true,
      subscription: new BehaviorSubject<PushSubscription | null>(null),
      requestSubscription: vi.fn(async () => {
        platform.permission = 'granted';
        const subscription = browserSubscription();
        swPush.subscription.next(subscription);
        return subscription;
      }),
      unsubscribe: vi.fn(async () => swPush.subscription.next(null)),
    };
    platform = { supported: true, permission: 'default' };
    signedIn = signal(true);
    sessionEnded = new Subject();
    installWay = signal<InstallWay>(null);
    installSuggestion = signal(false);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function setUp(): DevicePush {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
        { provide: SwPush, useValue: swPush },
        {
          provide: NOTIFICATION_PLATFORM,
          useValue: { supported: () => platform.supported, permission: () => platform.permission },
        },
        { provide: AuthSession, useValue: { isSignedIn: signedIn, ended: sessionEnded } },
        {
          provide: AppInstall,
          useValue: { way: installWay, suggestionVisible: installSuggestion },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(DevicePush);
  }

  // Lets the awaited calls inside the service resume.
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  /** Starts the service the way the app does, with the API offering push. */
  async function started(): Promise<DevicePush> {
    const push = setUp();
    TestBed.runInInjectionContext(() => push.start());
    TestBed.tick();
    await settle();
    http.expectOne(PUBLIC_KEY_URL).flush({ publicKey: KEY });
    await settle();
    return push;
  }

  describe('when it is offered', () => {
    it('invites a signed-in User on a device that can take notifications', async () => {
      const push = await started();

      expect(push.status()).toBe('off');
      expect(push.available()).toBe(true);
      expect(push.inviteVisible()).toBe(true);
    });

    it('offers nothing without a service worker or a Push API', async () => {
      swPush.isEnabled = false;
      const push = setUp();
      TestBed.runInInjectionContext(() => push.start());
      TestBed.tick();
      await settle();

      expect(push.available()).toBe(false);
      expect(push.inviteVisible()).toBe(false);
      http.expectNone(PUBLIC_KEY_URL);
    });

    it('offers nothing on an iPhone where SecretMatch is not installed', async () => {
      installWay.set('guide');
      const push = await started();

      expect(push.available()).toBe(false);
      expect(push.inviteVisible()).toBe(false);
    });

    it('offers nothing when the API sends no notifications', async () => {
      const push = setUp();
      TestBed.runInInjectionContext(() => push.start());
      TestBed.tick();
      await settle();
      http
        .expectOne(PUBLIC_KEY_URL)
        .flush(
          { type: 'urn:secretmatch:problem:push-off', status: 404 },
          { status: 404, statusText: 'Not Found' },
        );
      await settle();

      expect(push.available()).toBe(false);
    });

    it('offers nothing while the API cannot be reached, and asks again on the next sign-in', async () => {
      const push = setUp();
      TestBed.runInInjectionContext(() => push.start());
      TestBed.tick();
      await settle();
      http.expectOne(PUBLIC_KEY_URL).error(new ProgressEvent('error'), { status: 0 });
      await settle();
      expect(push.available()).toBe(false);

      signedIn.set(false);
      TestBed.tick();
      signedIn.set(true);
      TestBed.tick();
      await settle();
      http.expectOne(PUBLIC_KEY_URL).flush({ publicKey: KEY });
      await settle();

      expect(push.available()).toBe(true);
    });

    it('offers nothing signed out', async () => {
      const push = await started();

      signedIn.set(false);
      TestBed.tick();

      expect(push.available()).toBe(false);
      expect(push.inviteVisible()).toBe(false);
    });

    it('does not invite where notifications are blocked, nor while the install bar is up', async () => {
      platform.permission = 'denied';
      const blocked = await started();
      expect(blocked.status()).toBe('denied');
      expect(blocked.inviteVisible()).toBe(false);

      TestBed.resetTestingModule();
      platform.permission = 'default';
      installSuggestion.set(true);
      const installing = await started();
      expect(installing.inviteVisible()).toBe(false);
      installSuggestion.set(false);
      expect(installing.inviteVisible()).toBe(true);
    });
  });

  describe('"Ahora no"', () => {
    it('hides the invitation on this device for good', async () => {
      const push = await started();

      push.dismissInvite();
      expect(push.inviteVisible()).toBe(false);

      TestBed.resetTestingModule();
      const later = await started();
      expect(later.inviteVisible()).toBe(false);
      expect(later.available()).toBe(true);
    });

    it('never invites when storage is blocked, since it could not remember a "no"', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      const push = await started();

      expect(push.inviteVisible()).toBe(false);
      expect(push.available()).toBe(true);
    });
  });

  describe('turning notifications on', () => {
    it('subscribes the browser with the API key and hands the subscription to the API', async () => {
      const push = await started();

      const done = push.turnOn();
      await settle();
      const request = http.expectOne(SUBSCRIPTIONS_URL);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual(SUBSCRIPTION_JSON);
      request.flush(null, { status: 204, statusText: 'No Content' });

      await expect(done).resolves.toBe('on');
      expect(swPush.requestSubscription).toHaveBeenCalledWith({ serverPublicKey: KEY });
      expect(push.status()).toBe('on');
      expect(push.inviteVisible()).toBe(false);
    });

    it('ends up blocked when the person blocks notifications in the dialog', async () => {
      const push = await started();
      swPush.requestSubscription.mockImplementation(async () => {
        platform.permission = 'denied';
        throw new DOMException('Permission denied', 'NotAllowedError');
      });

      await expect(push.turnOn()).resolves.toBe('denied');
      expect(push.status()).toBe('denied');
    });

    it('stays off when the dialog is closed without an answer', async () => {
      const push = await started();
      swPush.requestSubscription.mockRejectedValue(
        new DOMException('Dismissed', 'NotAllowedError'),
      );

      await expect(push.turnOn()).resolves.toBe('off');
      expect(push.status()).toBe('off');
      expect(push.inviteVisible()).toBe(true);
    });

    it('undoes the browser subscription when the API cannot keep it', async () => {
      const push = await started();

      const done = push.turnOn();
      await settle();
      http.expectOne(SUBSCRIPTIONS_URL).error(new ProgressEvent('error'), { status: 0 });

      await expect(done).resolves.toBe('failed');
      expect(swPush.unsubscribe).toHaveBeenCalled();
      expect(push.status()).toBe('off');
    });
  });

  describe('turning notifications off', () => {
    it('forgets the device in the API, then unsubscribes the browser', async () => {
      swPush.subscription.next(browserSubscription());
      platform.permission = 'granted';
      const push = await started();
      http.expectOne(SUBSCRIPTIONS_URL).flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      const done = push.turnOff();
      await settle();
      const request = http.expectOne(SUBSCRIPTIONS_URL);
      expect(request.request.method).toBe('DELETE');
      expect(request.request.body).toEqual({ endpoint: ENDPOINT });
      expect(swPush.unsubscribe).not.toHaveBeenCalled();
      request.flush(null, { status: 204, statusText: 'No Content' });

      await expect(done).resolves.toBe('off');
      expect(swPush.unsubscribe).toHaveBeenCalled();
      expect(push.status()).toBe('off');
    });

    it('stays on when the API cannot forget the device', async () => {
      swPush.subscription.next(browserSubscription());
      platform.permission = 'granted';
      const push = await started();
      http.expectOne(SUBSCRIPTIONS_URL).flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      const done = push.turnOff();
      await settle();
      http.expectOne(SUBSCRIPTIONS_URL).error(new ProgressEvent('error'), { status: 0 });

      await expect(done).resolves.toBe('failed');
      expect(swPush.unsubscribe).not.toHaveBeenCalled();
      expect(push.status()).toBe('on');
    });
  });

  describe('keeping the API in step', () => {
    it("hands an existing subscription to the API again on start, so it is this User's", async () => {
      swPush.subscription.next(browserSubscription());
      platform.permission = 'granted';
      const push = await started();

      const request = http.expectOne(SUBSCRIPTIONS_URL);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual(SUBSCRIPTION_JSON);
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(push.status()).toBe('on');
    });

    it('forgets the device in the API and the browser before signing out', async () => {
      swPush.subscription.next(browserSubscription());
      platform.permission = 'granted';
      const push = await started();
      http.expectOne(SUBSCRIPTIONS_URL).flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      const done = push.forgetThisDevice();
      await settle();
      http
        .expectOne({ method: 'DELETE', url: SUBSCRIPTIONS_URL })
        .flush(null, { status: 204, statusText: 'No Content' });
      await done;

      expect(swPush.unsubscribe).toHaveBeenCalled();
    });

    it('has nothing to forget on a device without notifications', async () => {
      const push = await started();

      await push.forgetThisDevice();

      expect(swPush.unsubscribe).not.toHaveBeenCalled();
    });

    it('unsubscribes the browser when the session ends, without asking the API', async () => {
      swPush.subscription.next(browserSubscription());
      platform.permission = 'granted';
      await started();
      http.expectOne(SUBSCRIPTIONS_URL).flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      sessionEnded.next();
      await settle();

      expect(swPush.unsubscribe).toHaveBeenCalled();
      http.expectNone(SUBSCRIPTIONS_URL);
    });
  });
});

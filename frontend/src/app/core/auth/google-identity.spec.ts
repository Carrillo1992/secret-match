import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../config/app-config';
import { GoogleIdentity } from './google-identity';

describe('GoogleIdentity', () => {
  const setUp = (googleClientId?: string) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: APP_CONFIG, useValue: { apiBaseUrl: 'http://api.test', googleClientId } },
      ],
    });
    return TestBed.inject(GoogleIdentity);
  };
  const scripts = () =>
    TestBed.inject(DOCUMENT).head.querySelectorAll(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

  afterEach(() => {
    scripts().forEach((script) => script.remove());
    vi.unstubAllGlobals();
  });

  it('draws nothing, and loads no script from Google, without a client id', async () => {
    const google = setUp(undefined);

    await expect(google.renderButton(document.createElement('div'), 320, vi.fn())).resolves.toBe(
      false,
    );
    expect(scripts()).toHaveLength(0);
  });

  it("draws Google's button for our client id and passes on the ID token it returns", async () => {
    const accounts = { initialize: vi.fn(), renderButton: vi.fn() };
    vi.stubGlobal('google', { accounts: { id: accounts } });
    const google = setUp('id.apps.test');
    const parent = document.createElement('div');
    const onIdToken = vi.fn();

    await expect(google.renderButton(parent, 1000, onIdToken)).resolves.toBe(true);

    expect(accounts.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'id.apps.test' }),
    );
    expect(accounts.renderButton).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ text: 'continue_with', locale: 'es', width: 400 }),
    );
    accounts.initialize.mock.calls[0][0].callback({ credential: 'google-id-token' });
    expect(onIdToken).toHaveBeenCalledWith('google-id-token');
  });

  it("loads Google's script once, and draws nothing when it fails to load", async () => {
    const google = setUp('id.apps.test');

    const rendered = google.renderButton(document.createElement('div'), 320, vi.fn());
    expect(scripts()).toHaveLength(1);
    scripts()[0].dispatchEvent(new Event('error'));

    await expect(rendered).resolves.toBe(false);
    expect(scripts()).toHaveLength(0);
  });
});

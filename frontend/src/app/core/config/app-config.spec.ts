import { loadAppConfig } from './app-config';

describe('loadAppConfig', () => {
  const serveConfig = (body: unknown, status = 200) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(body), { status })),
    );

  const offline = () =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('reads the API base URL from /config.json', async () => {
    serveConfig({ apiBaseUrl: 'https://api.example.org' });

    await expect(loadAppConfig()).resolves.toEqual({ apiBaseUrl: 'https://api.example.org' });
    expect(fetch).toHaveBeenCalledWith('/config.json');
  });

  it('drops trailing slashes so API paths can be appended', async () => {
    serveConfig({ apiBaseUrl: 'https://api.example.org//' });

    await expect(loadAppConfig()).resolves.toEqual({ apiBaseUrl: 'https://api.example.org' });
  });

  it('reads the Google client id when there is one', async () => {
    serveConfig({ apiBaseUrl: 'https://api.example.org', googleClientId: ' id.apps.test ' });

    await expect(loadAppConfig()).resolves.toEqual({
      apiBaseUrl: 'https://api.example.org',
      googleClientId: 'id.apps.test',
    });
  });

  it.each([{ googleClientId: '' }, { googleClientId: '  ' }, { googleClientId: 42 }])(
    'leaves Google sign-in off without a usable client id: %j',
    async (google) => {
      serveConfig({ apiBaseUrl: 'https://api.example.org', ...google });

      await expect(loadAppConfig()).resolves.toEqual({ apiBaseUrl: 'https://api.example.org' });
    },
  );

  it('fails when /config.json cannot be loaded', async () => {
    serveConfig({}, 404);

    await expect(loadAppConfig()).rejects.toThrow('Could not load /config.json: HTTP 404');
  });

  it.each([{}, { apiBaseUrl: '' }, { apiBaseUrl: 42 }])(
    'fails when the API base URL is missing or invalid: %j',
    async (body) => {
      serveConfig(body);

      await expect(loadAppConfig()).rejects.toThrow('must define a non-empty "apiBaseUrl"');
    },
  );

  describe('offline, in the installed app (#117)', () => {
    it('starts with the config it last read from the network on this device', async () => {
      serveConfig({ apiBaseUrl: 'https://api.example.org', googleClientId: 'id.apps.test' });
      await loadAppConfig();

      offline();

      await expect(loadAppConfig()).resolves.toEqual({
        apiBaseUrl: 'https://api.example.org',
        googleClientId: 'id.apps.test',
      });
    });

    it('always prefers the network: a new deploy replaces the remembered config', async () => {
      serveConfig({ apiBaseUrl: 'https://old.example.org' });
      await loadAppConfig();
      serveConfig({ apiBaseUrl: 'https://new.example.org' });

      await expect(loadAppConfig()).resolves.toEqual({ apiBaseUrl: 'https://new.example.org' });
      offline();
      await expect(loadAppConfig()).resolves.toEqual({ apiBaseUrl: 'https://new.example.org' });
    });

    it('still fails on a first visit, with nothing remembered', async () => {
      offline();

      await expect(loadAppConfig()).rejects.toThrow('Failed to fetch');
    });

    it('does not hide a broken deploy behind the remembered config', async () => {
      serveConfig({ apiBaseUrl: 'https://api.example.org' });
      await loadAppConfig();
      serveConfig({}, 404);

      await expect(loadAppConfig()).rejects.toThrow('HTTP 404');
    });

    it('ignores a remembered config that is not usable', async () => {
      localStorage.setItem('secretmatch.appConfig', '{"apiBaseUrl":42}');
      offline();

      await expect(loadAppConfig()).rejects.toThrow('Failed to fetch');
    });

    it('works when storage is blocked', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
      serveConfig({ apiBaseUrl: 'https://api.example.org' });

      await expect(loadAppConfig()).resolves.toEqual({ apiBaseUrl: 'https://api.example.org' });
      offline();
      await expect(loadAppConfig()).rejects.toThrow('Failed to fetch');
    });
  });
});

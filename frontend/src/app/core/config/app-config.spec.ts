import { loadAppConfig } from './app-config';

describe('loadAppConfig', () => {
  const serveConfig = (body: unknown, status = 200) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(body), { status })),
    );

  afterEach(() => vi.unstubAllGlobals());

  it('reads the API base URL from /config.json', async () => {
    serveConfig({ apiBaseUrl: 'https://api.example.org' });

    await expect(loadAppConfig()).resolves.toEqual({ apiBaseUrl: 'https://api.example.org' });
    expect(fetch).toHaveBeenCalledWith('/config.json');
  });

  it('drops trailing slashes so API paths can be appended', async () => {
    serveConfig({ apiBaseUrl: 'https://api.example.org//' });

    await expect(loadAppConfig()).resolves.toEqual({ apiBaseUrl: 'https://api.example.org' });
  });

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
});

import { envelopeWasOpened, rememberOpenedEnvelope } from './opened-envelopes';

describe('opened envelopes', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('knows no envelope before it is opened', () => {
    expect(envelopeWasOpened('g-1', 'u-marta')).toBe(false);
  });

  it('remembers an opened envelope for that Group and Receiver', () => {
    rememberOpenedEnvelope('g-1', 'u-marta');

    expect(envelopeWasOpened('g-1', 'u-marta')).toBe(true);
    expect(envelopeWasOpened('g-2', 'u-marta')).toBe(false);
  });

  it('treats a new Draw with another Receiver as a closed envelope', () => {
    rememberOpenedEnvelope('g-1', 'u-marta');

    expect(envelopeWasOpened('g-1', 'u-pedro')).toBe(false);
  });

  it('falls back to a closed envelope when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() => rememberOpenedEnvelope('g-1', 'u-marta')).not.toThrow();
    expect(envelopeWasOpened('g-1', 'u-marta')).toBe(false);
  });
});

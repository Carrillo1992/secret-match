import { TestBed } from '@angular/core/testing';
import { ThemePreference } from './theme-preference';

const KEY = 'secretmatch.theme';
const root = document.documentElement;

describe('ThemePreference', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    delete root.dataset['theme'];
  });

  const create = () => TestBed.inject(ThemePreference);

  it('is System on a first visit and leaves the OS in charge', () => {
    const preference = create();

    expect(preference.theme()).toBe('system');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('forces Dark or Light on the page when chosen', () => {
    const preference = create();

    preference.choose('dark');
    expect(preference.theme()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');

    preference.choose('light');
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('gives the page back to the OS when System is chosen again', () => {
    const preference = create();
    preference.choose('dark');

    preference.choose('system');

    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('remembers the choice on this device for the next visit', () => {
    create().choose('light');

    expect(localStorage.getItem(KEY)).toBe('light');
    TestBed.resetTestingModule();
    expect(create().theme()).toBe('light');
  });

  it('forgets the stored choice when System is chosen', () => {
    const preference = create();
    preference.choose('dark');

    preference.choose('system');

    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(KEY, 'sepia');

    expect(create().theme()).toBe('system');
  });

  it('is System when storage is blocked, and still applies a choice for this visit', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const preference = create();

    expect(preference.theme()).toBe('system');
    preference.choose('dark');
    expect(preference.theme()).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });
});

import { TestBed } from '@angular/core/testing';
import { EnvelopeDemo } from './envelope-demo';

describe('EnvelopeDemo', () => {
  const text = (element: Element | null | undefined) =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const reducedMotion = (reduce: boolean) =>
    vi
      .spyOn(window, 'matchMedia')
      .mockImplementation((query: string) => ({ matches: reduce, media: query }) as MediaQueryList);

  const render = async () => {
    const fixture = TestBed.createComponent(EnvelopeDemo);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const button = () => element.querySelector('button');
    const live = () => element.querySelector('[aria-live="polite"]');
    return { fixture, element, button, live };
  };

  beforeEach(() => {
    // jsdom has no matchMedia: give it one that asks for full motion unless a test says otherwise.
    window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts sealed, with the example name not in the page yet', async () => {
    const { element, button } = await render();

    expect(text(button())).toBe('Abrir el sobre');
    expect(text(element)).not.toContain('Marta');
  });

  it('plays the opening, then announces the example Receiver', async () => {
    const { fixture, button, live } = await render();
    vi.useFakeTimers();

    button()?.click();
    fixture.detectChanges();
    expect(text(live())).not.toContain('Marta');

    vi.advanceTimersByTime(1200);
    fixture.detectChanges();
    expect(text(live())).toContain('Te toca regalar a Marta');
    expect(text(button())).toBe('Volver a cerrarlo');
  });

  it('opens straight away with reduced motion', async () => {
    reducedMotion(true);
    const { fixture, button, live } = await render();

    button()?.click();
    fixture.detectChanges();

    expect(text(live())).toContain('Marta');
  });

  it('closes again, also halfway through the opening', async () => {
    const { fixture, button, live } = await render();
    vi.useFakeTimers();

    button()?.click();
    fixture.detectChanges();
    button()?.click();
    fixture.detectChanges();
    vi.advanceTimersByTime(1200);
    fixture.detectChanges();

    expect(text(live())).toBe('');
    expect(text(button())).toBe('Abrir el sobre');
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EnvelopeReveal } from './envelope-reveal';

const MARTA = { id: 'u-marta', displayName: 'Marta' };

describe('EnvelopeReveal', () => {
  let opened: number;

  async function render(alreadyOpened = false) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(EnvelopeReveal);
    fixture.componentRef.setInput('receiver', MARTA);
    fixture.componentRef.setInput('alreadyOpened', alreadyOpened);
    opened = 0;
    fixture.componentInstance.opened.subscribe(() => opened++);
    await fixture.whenStable();
    return fixture;
  }
  const text = (element: Element | null | undefined) =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const button = (element: HTMLElement, label: string) =>
    [...element.querySelectorAll('button')].find((b) => text(b).includes(label));
  const settle = async (fixture: { whenStable: () => Promise<unknown> }) => {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
  };
  const reducedMotion = (reduce: boolean) =>
    vi
      .spyOn(window, 'matchMedia')
      .mockImplementation((query: string) => ({ matches: reduce, media: query }) as MediaQueryList);

  beforeEach(() => {
    // jsdom has no matchMedia: give it one that asks for full motion unless a test says otherwise.
    window.matchMedia ??= (() => ({ matches: false })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps the Receiver hidden until the envelope is opened', async () => {
    const element = (await render()).nativeElement as HTMLElement;

    expect(text(element)).toContain('Tienes un sobre cerrado');
    expect(button(element, 'Abrir el sobre')).toBeDefined();
    expect(text(element)).not.toContain('Marta');
    expect(element.querySelector('a')).toBeNull();
  });

  it('plays the opening, which can be skipped, then shows the Receiver and their Wishlist', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    button(element, 'Abrir el sobre')?.click();
    await settle(fixture);
    expect(opened).toBe(1);
    expect(text(element)).not.toContain('Marta');
    const skip = button(element, 'Saltar animación');
    expect(skip).toBeDefined();

    skip?.click();
    await settle(fixture);

    expect(text(element)).toContain('Te toca regalar a Marta');
    expect(text(element)).toContain('Nadie más lo sabe.');
    const link = element.querySelector('a');
    expect(text(link)).toBe('Ver sus deseos');
    expect(link?.getAttribute('href')).toBe('/members/u-marta/wishlist');
    expect(document.activeElement?.textContent?.trim()).toBe('Marta');
  });

  it('shows the Receiver on its own once the opening has played', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    button(element, 'Abrir el sobre')?.click();
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();
    await settle(fixture);

    expect(text(element)).toContain('Te toca regalar a Marta');
    expect(button(element, 'Saltar animación')).toBeUndefined();
  });

  it('skips the opening when the system asks for reduced motion', async () => {
    reducedMotion(true);
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;

    button(element, 'Abrir el sobre')?.click();
    await settle(fixture);

    expect(button(element, 'Saltar animación')).toBeUndefined();
    expect(text(element)).toContain('Te toca regalar a Marta');
    expect(opened).toBe(1);
  });

  it('shows an envelope opened before already open, and can open it again', async () => {
    const fixture = await render(true);
    const element = fixture.nativeElement as HTMLElement;

    expect(text(element)).toContain('Te toca regalar a Marta');
    expect(button(element, 'Abrir el sobre')).toBeUndefined();

    button(element, 'Volver a abrir el sobre')?.click();
    await settle(fixture);

    expect(button(element, 'Saltar animación')).toBeDefined();
    expect(text(element)).not.toContain('Marta');
  });

  it('announces the Receiver to screen readers once revealed', async () => {
    reducedMotion(true);
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const live = () => element.querySelector('[aria-live="polite"]');
    expect(text(live())).toBe('');

    button(element, 'Abrir el sobre')?.click();
    await settle(fixture);

    expect(text(live())).toBe('Te toca regalar a Marta');
  });
});

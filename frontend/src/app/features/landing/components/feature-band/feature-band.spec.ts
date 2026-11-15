import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FeatureBand } from './feature-band';

@Component({
  imports: [FeatureBand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-feature-band id="plain" heading="Pregunta sin delatarte" lead="Escribe sin firmar.">
      <p bandNote>Nadie sabrá que eres tú.</p>
      <p>Demo</p>
    </app-feature-band>
    <app-feature-band id="flipped" heading="Otra" lead="Más" tone="surface" reverse />
  `,
})
class Host {}

describe('FeatureBand', () => {
  let page: HTMLElement;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const band = (id: string) => page.querySelector<HTMLElement>(`#${id}`);

  it('shows the selling point as a section heading, its lead, its note and its demo', () => {
    expect(band('plain')?.querySelector('h2')?.textContent).toContain('Pregunta sin delatarte');
    expect(band('plain')?.textContent).toContain('Escribe sin firmar.');
    expect(band('plain')?.textContent).toContain('Nadie sabrá que eres tú.');
    expect(band('plain')?.textContent).toContain('Demo');
  });

  it('sits on the canvas by default and on the surface when asked', () => {
    expect(band('plain')?.classList).toContain('bg-canvas');
    expect(band('flipped')?.classList).toContain('bg-surface');
  });

  it('puts the text on the right from md only when reversed', () => {
    expect(band('plain')?.querySelector('.md\\:order-2')).toBeNull();
    expect(band('flipped')?.querySelector('.md\\:order-2')).not.toBeNull();
  });
});

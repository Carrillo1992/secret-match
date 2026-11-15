import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { KoFiLink } from './ko-fi-link';

@Component({
  imports: [KoFiLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ko-fi-link id="link">Invítame a un café</app-ko-fi-link>
    <app-ko-fi-link id="button" look="button">Invítame a un café</app-ko-fi-link>
  `,
})
class Host {}

describe('KoFiLink', () => {
  let page: HTMLElement;
  let link: HTMLAnchorElement | null;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    page = fixture.nativeElement as HTMLElement;
    link = page.querySelector('#link a');
  });

  it("links to SecretMatch's Ko-fi page in a new tab, without handing it this page", () => {
    expect(link?.getAttribute('href')).toBe('https://ko-fi.com/daniel92');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener');
  });

  it('says what it is for and that it opens a new tab', () => {
    expect(link?.textContent).toContain('Invítame a un café');
    expect(link?.querySelector('.sr-only')?.textContent).toContain(
      '(se abre en una pestaña nueva)',
    );
  });

  it('is a quiet inline link by default and a secondary button on its own', () => {
    const button = page.querySelector('#button a');
    expect(link?.classList).toContain('underline');
    expect(link?.classList).not.toContain('border-primary');
    expect(button?.classList).toContain('border-primary');
    expect(button?.getAttribute('href')).toBe('https://ko-fi.com/daniel92');
    expect(button?.textContent).toContain('(se abre en una pestaña nueva)');
  });
});

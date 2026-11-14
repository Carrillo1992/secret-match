import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppShell } from './app-shell';

@Component({
  imports: [AppShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-shell><h1>Página</h1></app-shell>`,
})
class Host {}

describe('AppShell', () => {
  beforeAll(() => import('@lucide/angular'), 90_000);

  it('offers the Preferences menu in its header', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('header button[aria-label="Preferencias"]')).not.toBeNull();
  });
});

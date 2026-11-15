import { spanishLeftIn } from '../../../../../testing/english';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';

describe('SignUpPage in English', () => {
  // Imported once the English copy is loaded: copy written with `$localize` at module level is
  // translated as its module loads. Loading `@lucide/angular` takes a while on a busy machine.
  let SignUpPage: typeof import('./sign-up-page').SignUpPage;

  beforeAll(async () => {
    ({ SignUpPage } = await import('./sign-up-page'));
  }, 90_000);

  it('speaks English, its field errors included', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    const fixture = TestBed.createComponent(SignUpPage);
    const page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();

    page.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toContain('Create your account');
    expect(page.textContent).toContain('Enter your email.');
    expect(page.textContent).toContain('Enter your name.');
    expect(page.textContent).toContain('Enter a password.');
    expect(spanishLeftIn(page)).toEqual([]);
    TestBed.inject(HttpTestingController).verify();
  });
});

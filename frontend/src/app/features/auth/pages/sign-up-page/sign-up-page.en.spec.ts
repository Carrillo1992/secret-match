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

  it('says in English to wait when there were too many attempts', async () => {
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
    const type = (id: string, value: string) => {
      const input = page.querySelector<HTMLInputElement>(`#${id}`);
      if (!input) {
        throw new Error(`No field #${id}`);
      }
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('sign-up-email', 'ana@example.com');
    type('sign-up-display-name', 'Ana');
    type('sign-up-password', 'turrón-y-polvorones');

    page.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    TestBed.inject(HttpTestingController)
      .expectOne('http://api.test/api/v1/sign-ups')
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    await fixture.whenStable();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'Too many attempts. Try again later.',
    );
    expect(spanishLeftIn(page)).toEqual([]);
  });
});

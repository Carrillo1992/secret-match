import type { MockInstance } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { SignUpPage } from './sign-up-page';

const SIGN_UP_URL = 'http://api.test/api/v1/sign-ups';

describe('SignUpPage', () => {
  let fixture: ComponentFixture<SignUpPage>;
  let http: HttpTestingController;
  let page: HTMLElement;
  let navigate: MockInstance<Router['navigate']>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(SignUpPage);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const field = (label: string) => {
    const labelElement = [...page.querySelectorAll('label')].find((l) =>
      l.textContent?.includes(label),
    );
    const input = page.querySelector<HTMLInputElement>(`#${labelElement?.htmlFor ?? 'missing'}`);
    if (!input) {
      throw new Error(`No field labelled "${label}"`);
    }
    return input;
  };
  const type = (label: string, value: string) => {
    const input = field(label);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    page.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    await fixture.whenStable();
  };
  // Lets the page's awaited API call resume, then renders.
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };
  const errorFor = (label: string) => {
    const describedBy = field(label).getAttribute('aria-describedby');
    return describedBy ? (page.querySelector(`#${describedBy}`)?.textContent ?? '') : '';
  };
  const fillValidForm = () => {
    type('Correo electrónico', 'ana@example.com');
    type('Nombre', 'Ana');
    type('Contraseña', 'turrón-y-polvorones');
  };

  it('labels every field for screen readers', () => {
    expect(field('Correo electrónico').type).toBe('email');
    expect(field('Nombre').type).toBe('text');
    expect(field('Contraseña').type).toBe('password');
  });

  it('shows what is missing next to each field and sends nothing', async () => {
    await submit();

    expect(errorFor('Correo electrónico')).toContain('Escribe tu correo');
    expect(errorFor('Nombre')).toContain('Escribe tu nombre');
    expect(errorFor('Contraseña')).toContain('Escribe una contraseña');
    http.expectNone(SIGN_UP_URL);
  });

  it('rejects a malformed email, a blank name and a short password', async () => {
    type('Correo electrónico', 'ana@example');
    type('Nombre', '   ');
    type('Contraseña', 'corta');
    await submit();

    expect(errorFor('Correo electrónico')).toContain('no parece un correo');
    expect(errorFor('Nombre')).toContain('Escribe tu nombre');
    expect(errorFor('Contraseña')).toContain('al menos 8 caracteres');
    http.expectNone(SIGN_UP_URL);
  });

  it('rejects a name over 50 characters and a password over 72 bytes', async () => {
    type('Correo electrónico', 'ana@example.com');
    type('Nombre', 'x'.repeat(51));
    // 40 characters, 80 bytes of UTF-8.
    type('Contraseña', 'ñ'.repeat(40));
    await submit();

    expect(errorFor('Nombre')).toContain('50 caracteres');
    expect(errorFor('Contraseña')).toContain('demasiado larga');
    http.expectNone(SIGN_UP_URL);
  });

  it('signs up and goes to the "check your email" page', async () => {
    fillValidForm();
    await submit();

    const request = http.expectOne(SIGN_UP_URL);
    expect(request.request.body).toEqual({
      email: 'ana@example.com',
      displayName: 'Ana',
      password: 'turrón-y-polvorones',
    });
    request.flush({ signUpId: 'id-1' }, { status: 202, statusText: 'Accepted' });
    await settle();

    expect(navigate).toHaveBeenCalledWith(['/check-email'], {
      queryParams: { signUp: 'id-1' },
      state: { email: 'ana@example.com' },
    });
  });

  it('disables the button while the sign-up is being sent', async () => {
    fillValidForm();
    await submit();

    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    http
      .expectOne(SIGN_UP_URL)
      .flush({ signUpId: 'id-1' }, { status: 202, statusText: 'Accepted' });
  });

  it('says the details were rejected when the API refuses them', async () => {
    fillValidForm();
    await submit();
    http.expectOne(SIGN_UP_URL).flush('{"status":400}', { status: 400, statusText: 'Bad Request' });
    await settle();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Revisa los datos');
  });

  it('asks to try again when the API cannot be reached', async () => {
    fillValidForm();
    await submit();
    http.expectOne(SIGN_UP_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Inténtalo de nuevo');
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });
});

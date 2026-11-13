import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { ProfilePage } from './profile-page';

const ME_URL = 'http://api.test/api/v1/users/me';
const DISPLAY_NAME_URL = `${ME_URL}/display-name`;
const PASSWORD_URL = `${ME_URL}/password`;
const SIGN_OUT_URL = 'http://api.test/api/v1/sessions/current';

@Component({ template: '<h1>Otra página</h1>' })
class Stub {}

const ana = { email: 'ana@example.com', displayName: 'Ana', hasPassword: true };

describe('ProfilePage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'profile', component: ProfilePage },
          { path: 'home', component: Stub },
          { path: '', component: Stub },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/profile');
  });

  afterEach(() => http.verify());

  const page = () => harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await harness.fixture.whenStable();
  };
  const loaded = async (user = ana) => {
    http.expectOne(ME_URL).flush(user);
    await settle();
  };
  const field = (label: string) => {
    const labelElement = [...page().querySelectorAll('label')].find((l) =>
      l.textContent?.includes(label),
    );
    const input = page().querySelector<HTMLInputElement>(`#${labelElement?.htmlFor ?? 'missing'}`);
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
  const button = (label: string) => {
    const found = [...page().querySelectorAll('button')].find((b) =>
      b.textContent?.includes(label),
    );
    if (!found) {
      throw new Error(`No button "${label}"`);
    }
    return found;
  };
  const press = async (label: string) => {
    button(label).click();
    await settle();
  };
  const errorFor = (label: string) => {
    const describedBy = field(label).getAttribute('aria-describedby') ?? '';
    return describedBy
      .split(' ')
      .map((id) => page().querySelector(`#${id}`)?.textContent ?? '')
      .join(' ');
  };
  const status = () =>
    [...page().querySelectorAll('[role="status"]')].map((s) => s.textContent ?? '').join(' ');

  it('shows the email and fills in the current display name', async () => {
    await loaded();

    expect(page().querySelector('h1')?.textContent).toContain('Tu perfil');
    expect(page().textContent).toContain('ana@example.com');
    expect(field('Tu nombre').value).toBe('Ana');
    const backLinks = [...page().querySelectorAll('a[href="/home"]')];
    expect(backLinks.some((link) => link.textContent?.includes('Volver a mis grupos'))).toBe(true);
  });

  it('saves a new display name and says so', async () => {
    await loaded();
    type('Tu nombre', 'Tía Ana');

    await press('Guardar nombre');
    const request = http.expectOne(DISPLAY_NAME_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ displayName: 'Tía Ana' });
    request.flush({ ...ana, displayName: 'Tía Ana' });
    await settle();

    expect(status()).toContain('Nombre guardado');
  });

  it('asks for a display name instead of sending a blank one', async () => {
    await loaded();
    type('Tu nombre', '   ');

    await press('Guardar nombre');

    expect(errorFor('Tu nombre')).toContain('Escribe tu nombre');
    http.expectNone(DISPLAY_NAME_URL);
  });

  it('says next to the field when the current password is wrong', async () => {
    await loaded();
    type('Contraseña actual', 'not-the-password');
    type('Nueva contraseña', 'mazapán-de-toledo');

    await press('Cambiar contraseña');
    const request = http.expectOne(PASSWORD_URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      currentPassword: 'not-the-password',
      newPassword: 'mazapán-de-toledo',
    });
    request.flush(JSON.stringify({ type: 'urn:secretmatch:problem:wrong-password', status: 422 }), {
      status: 422,
      statusText: 'Unprocessable Content',
    });
    await settle();

    expect(errorFor('Contraseña actual')).toContain('no es tu contraseña');
    expect(status()).not.toContain('Contraseña cambiada');
  });

  it('changes the password, empties the fields and says so', async () => {
    await loaded();
    type('Contraseña actual', 'turrón-y-polvorones');
    type('Nueva contraseña', 'mazapán-de-toledo');

    await press('Cambiar contraseña');
    http.expectOne(PASSWORD_URL).flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(status()).toContain('Contraseña cambiada');
    expect(field('Contraseña actual').value).toBe('');
    expect(field('Nueva contraseña').value).toBe('');
  });

  it('lets a User without a password (Google only) create one without a current one', async () => {
    await loaded({ ...ana, hasPassword: false });

    expect(page().textContent).toContain('Crea una contraseña');
    expect(() => field('Contraseña actual')).toThrow();
    type('Nueva contraseña', 'mazapán-de-toledo');

    await press('Crear contraseña');
    const request = http.expectOne(PASSWORD_URL);
    expect(request.request.body).toEqual({ newPassword: 'mazapán-de-toledo' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(status()).toContain('Contraseña creada');
    expect(field('Contraseña actual')).toBeTruthy();
    expect(button('Cambiar contraseña')).toBeTruthy();
  });

  it('asks for both passwords, and a long enough new one, before sending', async () => {
    await loaded();
    type('Nueva contraseña', 'corta');

    await press('Cambiar contraseña');

    expect(errorFor('Contraseña actual')).toContain('Escribe tu contraseña actual');
    expect(errorFor('Nueva contraseña')).toContain('al menos 8 caracteres');
    http.expectNone(PASSWORD_URL);
  });

  describe('deleting the account', () => {
    const accountDeletion = () =>
      http.expectOne((request) => request.url === ME_URL && request.method === 'DELETE');

    it('asks to confirm first, and cancelling sends nothing', async () => {
      await loaded();

      await press('Borrar mi cuenta');

      expect(page().textContent).toContain('¿Borrar tu cuenta?');
      await press('Cancelar');
      expect(page().textContent).not.toContain('¿Borrar tu cuenta?');
      http.expectNone((request) => request.method === 'DELETE');
    });

    it('deletes it once confirmed, ends the session and leaves the signed-in area', async () => {
      await loaded();
      await press('Borrar mi cuenta');

      await press('Sí, borrar mi cuenta');
      accountDeletion().flush(null, { status: 204, statusText: 'No Content' });
      await settle();
      http.expectOne(SIGN_OUT_URL).flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(harness.routeNativeElement?.textContent).toContain('Otra página');
      // The landing page reads it to say the account is gone.
      expect(TestBed.inject(Router).lastSuccessfulNavigation()?.extras.state).toEqual({
        accountDeleted: true,
      });
    });

    it('explains the refusal while the User is in a drawn Group that has not finished', async () => {
      await loaded();
      await press('Borrar mi cuenta');

      await press('Sí, borrar mi cuenta');
      accountDeletion().flush(
        JSON.stringify({ type: 'urn:secretmatch:problem:account-in-draw', status: 422 }),
        { status: 422, statusText: 'Unprocessable Content' },
      );
      await settle();

      const alert = page().querySelector('[role="alert"]')?.textContent ?? '';
      expect(alert).toContain('cancele el sorteo');
      expect(alert).toContain('fecha del intercambio');
      http.expectNone(SIGN_OUT_URL);
    });

    it('says so when the account could not be deleted', async () => {
      await loaded();
      await press('Borrar mi cuenta');

      await press('Sí, borrar mi cuenta');
      accountDeletion().flush(null, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(page().querySelector('[role="alert"]')?.textContent).toContain(
        'No hemos podido borrar tu cuenta',
      );
      expect(button('Borrar mi cuenta')).toBeTruthy();
    });
  });
});

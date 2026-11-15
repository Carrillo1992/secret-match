import { spanishLeftIn } from '../../../../../testing/english';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';

describe('ProfilePage in English', () => {
  // Imported once the English copy is loaded: copy written with `$localize` at module level is
  // translated as its module loads. Loading `@lucide/angular` takes a while on a busy machine.
  let ProfilePage: typeof import('./profile-page').ProfilePage;

  beforeAll(async () => {
    ({ ProfilePage } = await import('./profile-page'));
  }, 90_000);

  it('speaks English, the delete dialog and the password errors included', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'profile', component: ProfilePage }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/profile');
    http
      .expectOne('http://api.test/api/v1/users/me')
      .flush({ email: 'ann@example.com', displayName: 'Ann', hasPassword: true });
    await harness.fixture.whenStable();

    const page = harness.routeNativeElement as HTMLElement;
    // The password form, sent empty.
    page.querySelectorAll<HTMLFormElement>('form')[1]?.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();

    expect(page.querySelector('h1')?.textContent).toContain('Your Profile');
    expect(page.textContent).toContain('Enter your current password.');
    expect(page.textContent).toContain('Delete your account?');
    expect(spanishLeftIn(page)).toEqual([]);
    http.verify();
  });
});

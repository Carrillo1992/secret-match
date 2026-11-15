import { spanishLeftIn } from '../../../../../testing/english';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';

describe('JoinPage in English', () => {
  // Imported once the English copy is loaded: copy written with `$localize` at module level is
  // translated as its module loads. Loading `@lucide/angular` takes a while on a busy machine.
  let JoinPage: typeof import('./join-page').JoinPage;

  beforeAll(async () => {
    ({ JoinPage } = await import('./join-page'));
  }, 90_000);

  it('invites a signed-out visitor in English', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'join/:code', component: JoinPage }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/join/q8Xf3kL0');
    http
      .expectOne('http://api.test/api/v1/sessions/refresh')
      .flush(
        { type: 'urn:secretmatch:problem:session-expired', status: 422 },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve));
      await harness.fixture.whenStable();
    }

    const page = harness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain("You've been invited to a Group");
    expect(spanishLeftIn(page)).toEqual([]);
    http.verify();
  });
});

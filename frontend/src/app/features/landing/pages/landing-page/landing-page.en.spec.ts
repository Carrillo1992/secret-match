import { englishLocale, spanishLeftIn } from '../../../../../testing/english';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';

describe('LandingPage in English', () => {
  // Imported once the English copy is loaded: copy written with `$localize` at module level is
  // translated as its module loads. Loading `@lucide/angular` takes a while on a busy machine.
  let LandingPage: typeof import('./landing-page').LandingPage;

  beforeAll(async () => {
    ({ LandingPage } = await import('./landing-page'));
  }, 90_000);

  it('speaks English, the API error included', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
        englishLocale,
      ],
    });
    const fixture = TestBed.createComponent(LandingPage);
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne('http://api.test/actuator/health')
      .error(new ProgressEvent('error'), { status: 0 });
    await fixture.whenStable();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Create account');
    expect(page.textContent).toContain("We can't reach the server");
    expect(spanishLeftIn(page)).toEqual([]);
  });
});

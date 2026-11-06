import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { LandingPage } from './landing-page';

const HEALTH_URL = 'http://api.test/actuator/health';

describe('LandingPage', () => {
  let fixture: ComponentFixture<LandingPage>;
  let api: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    api = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LandingPage);
    // Not whenStable(): it would wait for the in-flight health request.
    TestBed.tick();
  });

  afterEach(() => api.verify());

  const statusText = () =>
    (fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent ?? '';
  const retryButton = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button');

  it('links to the sign-up page', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/sign-up"]');
    expect(link?.textContent).toContain('Crear cuenta');
    api.expectOne(HEALTH_URL);
  });

  it('says it is checking the API while the health request is in flight', () => {
    expect(statusText()).toContain('Comprobando');
    api.expectOne(HEALTH_URL);
  });

  it('shows "API OK" when the API reports itself up', async () => {
    api.expectOne(HEALTH_URL).flush({ status: 'UP' });
    await fixture.whenStable();

    expect(statusText()).toContain('API OK');
    expect(retryButton()).toBeNull();
  });

  it('shows the error state when the API cannot be reached', async () => {
    api.expectOne(HEALTH_URL).error(new ProgressEvent('error'), { status: 0 });
    await fixture.whenStable();

    expect(statusText()).toContain('No se puede conectar con la API');
    expect(statusText()).not.toContain('API OK');
  });

  it('shows the error state when the API reports itself down', async () => {
    api
      .expectOne(HEALTH_URL)
      .flush({ status: 'DOWN' }, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(statusText()).toContain('No se puede conectar con la API');
  });

  it('checks again when the user retries after an error', async () => {
    api.expectOne(HEALTH_URL).error(new ProgressEvent('error'), { status: 0 });
    await fixture.whenStable();

    retryButton()?.click();
    TestBed.tick();
    api.expectOne(HEALTH_URL).flush({ status: 'UP' });
    await fixture.whenStable();

    expect(statusText()).toContain('API OK');
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../../core/api/generated/api-configuration';
import { ApiHealth } from './api-health';

const HEALTH_URL = 'http://api.test/actuator/health';

// Waits for the health request to settle into a status.
const settle = () => TestBed.inject(ApplicationRef).whenStable();

describe('ApiHealth', () => {
  let health: ApiHealth;
  let api: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
        ApiHealth,
      ],
    });
    api = TestBed.inject(HttpTestingController);
    health = TestBed.inject(ApiHealth);
    TestBed.tick();
  });

  afterEach(() => api.verify());

  it('is checking while the health request is in flight', () => {
    expect(health.status()).toBe('checking');
    expect(api.expectOne(HEALTH_URL).request.method).toBe('GET');
  });

  it('is up when the API reports itself up', async () => {
    api.expectOne(HEALTH_URL).flush({ status: 'UP' });
    await settle();

    expect(health.status()).toBe('up');
  });

  it('is down when the API cannot be reached', async () => {
    api.expectOne(HEALTH_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();

    expect(health.status()).toBe('down');
  });

  it('is down when the API reports itself down', async () => {
    api
      .expectOne(HEALTH_URL)
      .flush({ status: 'DOWN' }, { status: 503, statusText: 'Service Unavailable' });
    await settle();

    expect(health.status()).toBe('down');
  });

  it('checks again on recheck', async () => {
    api.expectOne(HEALTH_URL).error(new ProgressEvent('error'), { status: 0 });
    await settle();

    health.recheck();
    TestBed.tick();
    expect(health.status()).toBe('checking');
    api.expectOne(HEALTH_URL).flush({ status: 'UP' });
    await settle();

    expect(health.status()).toBe('up');
  });
});

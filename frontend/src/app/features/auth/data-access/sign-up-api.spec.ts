import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../../core/api/generated/api-configuration';
import { SignUpApi } from './sign-up-api';

const API = 'http://api.test/api/v1';

const problem = (code: string) => ({
  type: `urn:secretmatch:problem:${code}`,
  status: 422,
  title: 'Unprocessable Content',
});

describe('SignUpApi', () => {
  let signUpApi: SignUpApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    signUpApi = TestBed.inject(SignUpApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the sign-up details', async () => {
    const done = signUpApi.signUp({
      email: 'ana@example.com',
      displayName: 'Ana',
      password: 'secreto123',
    });

    const request = http.expectOne(`${API}/sign-ups`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'ana@example.com',
      displayName: 'Ana',
      password: 'secreto123',
    });
    request.flush(null, { status: 202, statusText: 'Accepted' });

    await expect(done).resolves.toBe('accepted');
  });

  it('reports invalid details when the API answers 400', async () => {
    const done = signUpApi.signUp({
      email: 'ana@example',
      displayName: 'Ana',
      password: 'secreto123',
    });
    http
      .expectOne(`${API}/sign-ups`)
      .flush({ status: 400 }, { status: 400, statusText: 'Bad Request' });

    await expect(done).resolves.toBe('invalid');
  });

  it('reports invalid details when the domain rejects them with a 422', async () => {
    const done = signUpApi.signUp({
      email: 'ana@example',
      displayName: 'Ana',
      password: 'secreto123',
    });
    http.expectOne(`${API}/sign-ups`).flush(JSON.stringify(problem('invalid-email')), {
      status: 422,
      statusText: 'Unprocessable Content',
    });

    await expect(done).resolves.toBe('invalid');
  });

  it('reports a failure when the API cannot be reached', async () => {
    const done = signUpApi.signUp({
      email: 'ana@example.com',
      displayName: 'Ana',
      password: 'secreto123',
    });
    http.expectOne(`${API}/sign-ups`).error(new ProgressEvent('error'), { status: 0 });

    await expect(done).resolves.toBe('failed');
  });

  it('verifies an email with the token from the link', async () => {
    const done = signUpApi.verifyEmail('tok-123');

    const request = http.expectOne(`${API}/email-verifications`);
    expect(request.request.body).toEqual({ token: 'tok-123' });
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(done).resolves.toBe('verified');
  });

  it.each([
    ['verification-link-expired', 'expired'],
    ['verification-link-used', 'used'],
    ['verification-link-invalid', 'invalid'],
  ])('tells a %s link apart', async (code, outcome) => {
    const done = signUpApi.verifyEmail('tok-123');
    http
      .expectOne(`${API}/email-verifications`)
      .flush(JSON.stringify(problem(code)), { status: 422, statusText: 'Unprocessable Content' });

    await expect(done).resolves.toBe(outcome);
  });

  it('reports a failed verification when the API cannot be reached', async () => {
    const done = signUpApi.verifyEmail('tok-123');
    http.expectOne(`${API}/email-verifications`).error(new ProgressEvent('error'), { status: 0 });

    await expect(done).resolves.toBe('failed');
  });

  it('asks for a new verification email', async () => {
    const done = signUpApi.sendVerificationEmail('ana@example.com');

    const request = http.expectOne(`${API}/verification-emails`);
    expect(request.request.body).toEqual({ email: 'ana@example.com' });
    request.flush(null, { status: 202, statusText: 'Accepted' });

    await expect(done).resolves.toBe(true);
  });

  it('reports a failed request for a new verification email', async () => {
    const done = signUpApi.sendVerificationEmail('ana@example.com');
    http.expectOne(`${API}/verification-emails`).error(new ProgressEvent('error'), { status: 0 });

    await expect(done).resolves.toBe(false);
  });
});

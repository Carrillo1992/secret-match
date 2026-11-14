import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../../core/api/generated/api-configuration';
import { MailboxApi } from './mailbox-api';

const API = 'http://api.test/api/v1';
const MAILBOXES_URL = `${API}/groups/g-1/mailboxes`;
const MESSAGES_URL = `${API}/mailboxes/m-1/messages`;
const NOT_FOUND = { status: 404, statusText: 'Not Found' };
const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

const toLucia = { id: 'm-1', side: 'GIVER', receiverDisplayName: 'Lucía' } as const;
const fromGiver = { id: 'm-2', side: 'RECEIVER', receiverDisplayName: null } as const;
const hello = { mine: true, text: '¡Hola!', sentOn: '2026-12-10' };

describe('MailboxApi', () => {
  let mailboxApi: MailboxApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    mailboxApi = TestBed.inject(MailboxApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('the Member’s Mailboxes in a Group', () => {
    it('lists them as the API sends them', async () => {
      const done = mailboxApi.mailboxes('g-1');
      http.expectOne(MAILBOXES_URL).flush([toLucia, fromGiver]);

      await expect(done).resolves.toEqual({ status: 'loaded', mailboxes: [toLucia, fromGiver] });
    });

    it('has none for a Group the User is not in', async () => {
      const done = mailboxApi.mailboxes('g-1');
      http.expectOne(MAILBOXES_URL).flush({ status: 404 }, NOT_FOUND);

      await expect(done).resolves.toEqual({ status: 'loaded', mailboxes: [] });
    });

    it('reports any other error as a failure', async () => {
      const done = mailboxApi.mailboxes('g-1');
      http.expectOne(MAILBOXES_URL).flush(null, SERVER_ERROR);

      await expect(done).resolves.toEqual({ status: 'failed' });
    });
  });

  describe('the Messages of a Mailbox', () => {
    it('lists them oldest first, as the API sends them', async () => {
      const done = mailboxApi.messages('m-1');
      http.expectOne(MESSAGES_URL).flush([hello]);

      await expect(done).resolves.toEqual({ status: 'loaded', messages: [hello] });
    });

    it('says the Mailbox is not found when it is not the caller’s', async () => {
      const done = mailboxApi.messages('m-1');
      http.expectOne(MESSAGES_URL).flush({ status: 404 }, NOT_FOUND);

      await expect(done).resolves.toEqual({ status: 'not-found' });
    });

    it('reports any other error as a failure', async () => {
      const done = mailboxApi.messages('m-1');
      http.expectOne(MESSAGES_URL).flush(null, SERVER_ERROR);

      await expect(done).resolves.toEqual({ status: 'failed' });
    });
  });

  describe('sending a Message', () => {
    it('posts the text and returns the Message as stored', async () => {
      const done = mailboxApi.send('m-1', '¡Hola!');

      const request = http.expectOne(MESSAGES_URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ text: '¡Hola!' });
      request.flush(hello, { status: 201, statusText: 'Created' });

      await expect(done).resolves.toEqual({ status: 'sent', message: hello });
    });

    it('reports an invalid text when the API refuses it', async () => {
      const done = mailboxApi.send('m-1', ' ');
      http
        .expectOne(MESSAGES_URL)
        .flush(
          { type: 'urn:secretmatch:problem:invalid-message', status: 422 },
          { status: 422, statusText: 'Unprocessable Content' },
        );

      await expect(done).resolves.toEqual({ status: 'invalid' });
    });

    it('says the Mailbox is not found when it is no longer the caller’s', async () => {
      const done = mailboxApi.send('m-1', '¡Hola!');
      http.expectOne(MESSAGES_URL).flush({ status: 404 }, NOT_FOUND);

      await expect(done).resolves.toEqual({ status: 'not-found' });
    });

    it('reports any other error as a failure', async () => {
      const done = mailboxApi.send('m-1', '¡Hola!');
      http.expectOne(MESSAGES_URL).flush(null, SERVER_ERROR);

      await expect(done).resolves.toEqual({ status: 'failed' });
    });
  });
});

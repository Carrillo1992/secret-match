import { englishLocale, spanishLeftIn } from '../../../../../testing/english';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';
import { rememberOpenedEnvelope } from '../../data-access/opened-envelopes';

const GROUP_URL = 'http://api.test/api/v1/groups/g-1';
const DRAW_URL = 'http://api.test/api/v1/groups/g-1/draw';
const EXCLUSIONS_URL = 'http://api.test/api/v1/groups/g-1/exclusions';
const MAILBOXES_URL = 'http://api.test/api/v1/groups/g-1/mailboxes';

const christmas = {
  id: 'g-1',
  name: 'Christmas at home',
  exchangeDate: '2026-12-24',
  budget: 30,
  currency: 'EUR',
  timeZone: 'Europe/Madrid',
  members: [
    { id: 'u-grace', displayName: 'Grandma Grace', admin: true, you: true },
    { id: 'u-luke', displayName: 'Luke', admin: false, you: false },
  ],
  inviteCode: 'q8Xf3kL0',
  admin: true,
  finished: false,
  drawn: false,
};

describe('GroupPage in English', () => {
  // Imported once the English copy is loaded: copy written with `$localize` at module level is
  // translated as its module loads. Loading `@lucide/angular` takes a while on a busy machine.
  let GroupPage: typeof import('./group-page').GroupPage;

  beforeAll(async () => {
    ({ GroupPage } = await import('./group-page'));
  }, 90_000);

  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'groups/:groupId', component: GroupPage }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
        englishLocale,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/groups/g-1');
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('secretmatch.openedEnvelopes');
  });

  const page = () => harness.routeNativeElement as HTMLElement;
  const text = (element: Element | null | undefined) =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  };

  it("speaks English to the Admin before the Draw, dates and money in English's format", async () => {
    http.expectOne(GROUP_URL).flush(christmas);
    await settle();
    http
      .expectOne((request) => request.url === DRAW_URL)
      .flush(
        { type: 'urn:secretmatch:problem:draw-not-found', status: 404 },
        { status: 404, statusText: 'Not Found' },
      );
    http.expectOne(EXCLUSIONS_URL).flush([]);
    await settle();

    expect(text(page())).toContain('Thursday, December 24, 2026');
    expect(text(page())).toContain('€30 per gift');
    expect(text(page())).toContain('Dates in Madrid time');
    expect(text(page())).toContain('Members (2)');
    expect(text(page())).toContain('so far there are 2 of you');
    expect(spanishLeftIn(page())).toEqual([]);
  });

  it("shows a dollar budget in English's format, and the edit form speaks English", async () => {
    http.expectOne(GROUP_URL).flush({ ...christmas, budget: 25.5, currency: 'USD' });
    await settle();
    http
      .expectOne((request) => request.url === DRAW_URL)
      .flush(
        { type: 'urn:secretmatch:problem:draw-not-found', status: 404 },
        { status: 404, statusText: 'Not Found' },
      );
    http.expectOne(EXCLUSIONS_URL).flush([]);
    await settle();

    expect(text(page())).toContain('$25.50 per gift');

    [...page().querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Edit')?.click();
    await settle();

    const currency = page().querySelector<HTMLSelectElement>('#edit-group-currency');
    expect([...(currency?.options ?? [])].map((option) => option.textContent?.trim())).toEqual([
      'Euro (€)',
      'US dollar ($)',
    ]);
    // Place names such as "Los Angeles" or "La Paz" among the Time Zones are not Spanish copy.
    const form = page().cloneNode(true) as Element;
    form.querySelector('#edit-group-time-zone')?.remove();
    expect(spanishLeftIn(form)).toEqual([]);
  });

  it('speaks English once the Draw is made, the Reveal and the Mailbox included', async () => {
    rememberOpenedEnvelope('g-1', 'u-luke');
    http.expectOne(GROUP_URL).flush({ ...christmas, drawn: true });
    await settle();
    http
      .expectOne((request) => request.url === DRAW_URL)
      .flush({ myReceiver: { id: 'u-luke', displayName: 'Luke' } });
    http.expectOne(EXCLUSIONS_URL).flush([]);
    await settle();
    http.expectOne(MAILBOXES_URL).flush([
      { id: 'm-1', side: 'GIVER', receiverDisplayName: 'Luke' },
      { id: 'm-2', side: 'RECEIVER', receiverDisplayName: null },
    ]);
    await settle();
    http.expectOne('http://api.test/api/v1/mailboxes/m-1/messages').flush([]);
    await settle();

    expect(text(page())).toContain("You're giving a gift to Luke");
    expect(text(page())).toContain('Your Giver');
    expect(spanishLeftIn(page())).toEqual([]);
  });
});

import { spanishLeftIn } from '../../../../../testing/english';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../../../core/api/generated/api-configuration';
import { authInterceptor } from '../../../../core/auth/auth.interceptor';

const headphones = {
  id: 'w-1',
  title: 'Headphones',
  link: 'https://shop.example/headphones',
  price: 49.9,
  notes: 'Wireless, black',
  priority: 'HIGH',
};

describe('WishlistPage in English', () => {
  // Imported once the English copy is loaded: copy written with `$localize` at module level is
  // translated as its module loads. Loading `@lucide/angular` takes a while on a busy machine.
  let WishlistPage: typeof import('./wishlist-page').WishlistPage;

  beforeAll(async () => {
    ({ WishlistPage } = await import('./wishlist-page'));
  }, 90_000);

  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'groups/:groupId/members/:memberId/wishlist', component: WishlistPage },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('http://api.test'),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/groups/g-1/members/u-luke/wishlist');
  });

  afterEach(() => {
    http
      .match('http://api.test/api/v1/groups/g-1')
      .forEach((request) =>
        request.flush({ id: 'g-1', name: 'Xmas', drawn: false, finished: false, members: [] }),
      );
    http.verify();
  });

  const page = () => harness.routeNativeElement as HTMLElement;
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  };

  it("speaks English on the owner's own Wishlist, its forms included", async () => {
    http.expectOne('http://api.test/api/v1/groups/g-1/members/u-luke/wishlist').flush({
      owner: { id: 'u-luke', displayName: 'Luke', you: true },
      wishes: [headphones],
      dontList: [{ id: 'd-1', text: 'Candles' }],
      currency: 'EUR',
      finished: false,
    });
    await settle();
    http
      .expectOne('http://api.test/api/v1/groups/g-1')
      .flush({ id: 'g-1', name: 'Xmas', drawn: false, finished: false, members: [] });
    await settle();
    await settle();
    page().querySelector<HTMLButtonElement>('#add-wish')?.click();
    page().querySelector<HTMLButtonElement>('#add-dont-list-entry')?.click();
    page().querySelector<HTMLButtonElement>('#edit-preferences')?.click();
    await settle();

    expect(page().querySelector('h1')?.textContent).toContain('Your Wishlist');
    expect(page().textContent).toContain('Only your Giver will see it, once the Draw is made.');
    expect(page().textContent).toContain('High');
    expect(page().textContent).toContain('About €49.90');
    expect(page().textContent).toContain('Approximate price');
    expect(spanishLeftIn(page())).toEqual([]);
  });

  it("speaks English on the Receiver's Wishlist, as their Giver sees it", async () => {
    http.expectOne('http://api.test/api/v1/groups/g-1/members/u-luke/wishlist').flush({
      owner: { id: 'u-luke', displayName: 'Luke', you: false },
      wishes: [],
      dontList: [{ id: 'd-1', text: 'Candles' }],
      preferences: 'Size M',
      currency: 'USD',
      finished: false,
    });
    await settle();

    expect(page().querySelector('h1')?.textContent).toContain("Luke's Wishlist");
    expect(page().textContent).toContain("Luke hasn't added any Wishes yet.");
    expect(page().textContent).toContain('Their Preferences');
    expect(spanishLeftIn(page())).toEqual([]);
  });

  it("reads a dollar Group's prices in English's format", async () => {
    http.expectOne('http://api.test/api/v1/groups/g-1/members/u-luke/wishlist').flush({
      owner: { id: 'u-luke', displayName: 'Luke', you: false },
      wishes: [{ id: 'w-2', title: 'Scarf', price: 25.5, priority: 'MEDIUM' }],
      dontList: [],
      currency: 'USD',
      finished: false,
    });
    await settle();

    expect(page().textContent).toContain('About $25.50');
  });
});

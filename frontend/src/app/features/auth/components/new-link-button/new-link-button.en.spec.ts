import { spanishLeftIn } from '../../../../../testing/english';
import { TestBed } from '@angular/core/testing';

describe('NewLinkButton in English', () => {
  // Imported once the English copy is loaded, like every English spec.
  let NewLinkButton: typeof import('./new-link-button').NewLinkButton;

  beforeAll(async () => {
    ({ NewLinkButton } = await import('./new-link-button'));
  }, 90_000);

  it('says in English to wait when there were too many attempts', async () => {
    const fixture = TestBed.createComponent(NewLinkButton);
    fixture.componentRef.setInput('status', 'throttled');
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Too many attempts. Try again later.',
    );
    expect(spanishLeftIn(page)).toEqual([]);
  });
});

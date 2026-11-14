import { spanishLeftIn } from '../../../../../testing/english';
import { TestBed } from '@angular/core/testing';
import type { MailboxesOutcome } from '../../data-access/mailbox-api';
import type { ThreadState } from '../mailbox-thread/mailbox-thread';

const toLucy = { id: 'm-1', side: 'GIVER', receiverDisplayName: 'Lucy' } as const;
const fromGiver = { id: 'm-2', side: 'RECEIVER', receiverDisplayName: null } as const;
const both: MailboxesOutcome = { status: 'loaded', mailboxes: [toLucy, fromGiver] };
const empty: ThreadState = { status: 'loaded', messages: [], fresh: 0 };

describe('MailboxCard in English', () => {
  // Imported once the English copy is loaded: copy written with `$localize` at module level is
  // translated as its module loads. Loading `@lucide/angular` takes a while on a busy machine.
  let MailboxCard: typeof import('./mailbox-card').MailboxCard;

  beforeAll(async () => {
    ({ MailboxCard } = await import('./mailbox-card'));
  }, 90_000);

  async function render(selected: string) {
    const fixture = TestBed.createComponent(MailboxCard);
    fixture.componentRef.setInput('mailboxes', both);
    fixture.componentRef.setInput('threads', {
      'm-1': empty,
      'm-2': {
        status: 'loaded',
        messages: [{ mine: false, text: 'Hi!', sentOn: '2026-12-10' }],
        fresh: 0,
      },
    });
    fixture.componentRef.setInput('selected', selected);
    fixture.componentRef.setInput('receiverRevealed', true);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }
  const text = (node: Element | null | undefined) =>
    (node?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('speaks English on the Giver side, the composer included', async () => {
    const card = await render('m-1');

    expect(text(card.querySelector('h2'))).toBe('Mailbox');
    expect(text(card.querySelector('#mailbox-panel-m-1'))).toContain(
      "You're their Giver. They'll never know it's you.",
    );
    expect(card.querySelector('textarea')?.getAttribute('placeholder')).toBe('Write a Message…');
    expect(spanishLeftIn(card)).toEqual([]);
  });

  it('calls the other side "Your Giver" and nothing more', async () => {
    const card = await render('m-2');

    const tabs = [...card.querySelectorAll('[role="tab"]')].map(text);
    expect(tabs).toEqual(['With Lucy', 'Your Giver']);
    const panel = card.querySelector('#mailbox-panel-m-2');
    expect(text(panel)).toContain("Your Giver. You'll never know who it is.");
    expect(text(panel)).toContain('Your Giver: Hi!');
    expect(card.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBe('Mailboxes');
    expect(spanishLeftIn(card)).toEqual([]);
  });
});

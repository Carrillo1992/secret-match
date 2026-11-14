import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MailboxesOutcome } from '../../data-access/mailbox-api';
import { ThreadState } from '../mailbox-thread/mailbox-thread';
import { MailboxCard, MessageToSend } from './mailbox-card';

const toLucia = { id: 'm-1', side: 'GIVER', receiverDisplayName: 'Lucía' } as const;
const fromGiver = { id: 'm-2', side: 'RECEIVER', receiverDisplayName: null } as const;
const both: MailboxesOutcome = { status: 'loaded', mailboxes: [toLucia, fromGiver] };
const empty: ThreadState = { status: 'loaded', messages: [], fresh: 0 };

describe('MailboxCard', () => {
  let fixture: ComponentFixture<MailboxCard>;
  let selected: string[];
  let retriedMessages: string[];
  let retriedMailboxes: number;
  let sent: MessageToSend[];

  async function render(
    mailboxes: MailboxesOutcome,
    threads: Record<string, ThreadState> = {},
    selectedId: string | null = null,
  ) {
    fixture = TestBed.createComponent(MailboxCard);
    fixture.componentRef.setInput('mailboxes', mailboxes);
    fixture.componentRef.setInput('threads', threads);
    fixture.componentRef.setInput('selected', selectedId);
    selected = [];
    retriedMessages = [];
    retriedMailboxes = 0;
    sent = [];
    fixture.componentInstance.choose.subscribe((id) => selected.push(id));
    fixture.componentInstance.retryMessages.subscribe((id) => retriedMessages.push(id));
    fixture.componentInstance.retryMailboxes.subscribe(() => retriedMailboxes++);
    fixture.componentInstance.send.subscribe((message) => sent.push(message));
    await fixture.whenStable();
  }

  const element = () => fixture.nativeElement as HTMLElement;
  const text = (node: Element | null | undefined) =>
    (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const tabs = () => [...element().querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panel = (id: string) => element().querySelector<HTMLElement>(`#mailbox-panel-${id}`);
  const press = (tab: HTMLElement, key: string) =>
    tab.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

  it('renders nothing when there are no Mailboxes, as before the Draw', async () => {
    await render({ status: 'loaded', mailboxes: [] });

    expect(
      element()
        .innerHTML.replace(/<!--.*?-->/g, '')
        .trim(),
    ).toBe('');
  });

  it('shows one tab per Mailbox, never naming the Giver', async () => {
    await render(both, { 'm-1': empty, 'm-2': empty });

    expect(text(element().querySelector('h2'))).toBe('Buzón');
    expect(tabs().map(text)).toEqual(['Con Lucía', 'Tu Giver']);
    const giverTab = tabs()[1];
    expect(giverTab.querySelector('img, svg')).toBeNull();
    expect(text(panel('m-2'))).not.toContain('Lucía');
  });

  it('opens the first Mailbox and hints who is on the other side', async () => {
    await render(both, { 'm-1': empty });

    const [first, second] = tabs();
    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(first.tabIndex).toBe(0);
    expect(second.getAttribute('aria-selected')).toBe('false');
    expect(second.tabIndex).toBe(-1);
    expect(first.getAttribute('aria-controls')).toBe('mailbox-panel-m-1');
    expect(panel('m-1')?.getAttribute('aria-labelledby')).toBe(first.id);
    expect(panel('m-1')?.hidden).toBe(false);
    expect(panel('m-2')?.hidden).toBe(true);
    expect(text(panel('m-1'))).toContain('Le regalas tú. No sabrá quién eres.');
    expect(text(panel('m-2'))).toContain('Quien te regala. Nunca sabrás quién es.');
  });

  it('asks for the other Mailbox when its tab is chosen', async () => {
    await render(both, { 'm-1': empty });

    tabs()[1].click();

    expect(selected).toEqual(['m-2']);
  });

  it('moves between the tabs with the arrow keys, Home and End', async () => {
    await render(both, { 'm-1': empty });
    const [first, second] = tabs();

    press(first, 'ArrowRight');
    expect(selected).toEqual(['m-2']);
    expect(document.activeElement).toBe(second);

    press(first, 'ArrowLeft');
    press(first, 'End');
    press(second, 'Home');
    expect(selected).toEqual(['m-2', 'm-2', 'm-2', 'm-1']);
  });

  it('shows the selected Mailbox', async () => {
    await render(both, { 'm-1': empty, 'm-2': empty }, 'm-2');

    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    expect(panel('m-2')?.hidden).toBe(false);
    expect(panel('m-1')?.hidden).toBe(true);
  });

  it('shows the empty conversation with the composer under it', async () => {
    await render(both, { 'm-1': empty });

    expect(text(panel('m-1'))).toContain('Aún no hay mensajes');
    expect(panel('m-1')?.querySelector('textarea')).not.toBeNull();
  });

  it('offers to retry a conversation that cannot be loaded, without the composer', async () => {
    await render(both, { 'm-1': { status: 'failed' } });

    expect(text(panel('m-1')?.querySelector('[role="alert"]'))).toContain(
      'No hemos podido cargar los mensajes',
    );
    expect(panel('m-1')?.querySelector('textarea')).toBeNull();
    panel('m-1')?.querySelector<HTMLButtonElement>('button')?.click();
    expect(retriedMessages).toEqual(['m-1']);
  });

  it('says it is loading a conversation not loaded yet', async () => {
    await render(both);

    expect(text(panel('m-1')?.querySelector('[role="status"]'))).toContain('Cargando mensajes');
  });

  it('sends what is written to the Mailbox it is written in', async () => {
    await render(both, { 'm-1': empty });
    const textarea = panel('m-1')?.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '¿Para leer o para la cocina?';
    textarea.dispatchEvent(new Event('input'));
    panel('m-1')?.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();

    expect(sent).toEqual([{ mailboxId: 'm-1', text: '¿Para leer o para la cocina?' }]);
  });

  it('offers to retry when the Mailboxes cannot be loaded', async () => {
    await render({ status: 'failed' });

    expect(text(element().querySelector('[role="alert"]'))).toContain(
      'No hemos podido cargar el buzón',
    );
    element().querySelector('button')?.click();
    expect(retriedMailboxes).toBe(1);
  });
});

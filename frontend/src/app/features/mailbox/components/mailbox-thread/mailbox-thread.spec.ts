import { TestBed } from '@angular/core/testing';
import { MailboxThread, ThreadState } from './mailbox-thread';
import { MailboxSide } from '../../data-access/mailbox-api';

const conversation: ThreadState = {
  status: 'loaded',
  messages: [
    { mine: true, text: '¿Prefieres algo para leer?', sentOn: '2026-12-10' },
    { mine: false, text: 'Para leer, sin duda.', sentOn: '2026-12-10' },
    { mine: true, text: '¿Alguna autora que ya tengas?', sentOn: '2026-12-12' },
  ],
  fresh: 0,
};

describe('MailboxThread', () => {
  async function render(state: ThreadState, side: MailboxSide = 'GIVER', author = 'Con Lucía') {
    const fixture = TestBed.createComponent(MailboxThread);
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('side', side);
    fixture.componentRef.setInput('author', author);
    await fixture.whenStable();
    return fixture;
  }
  const text = (element: Element | null | undefined) =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const bubbles = (element: HTMLElement) => [...element.querySelectorAll('p[data-message]')];

  it('groups the Messages by day under a date separator', async () => {
    const element = (await render(conversation)).nativeElement as HTMLElement;

    const items = [...element.querySelectorAll('ol > li')].map(text);
    expect(items).toEqual([
      '10 de diciembre',
      'Tú: ¿Prefieres algo para leer?',
      'Con Lucía: Para leer, sin duda.',
      '12 de diciembre',
      'Tú: ¿Alguna autora que ya tengas?',
    ]);
  });

  it('puts mine on the right in primary and theirs on the left in subtle', async () => {
    const element = (await render(conversation)).nativeElement as HTMLElement;
    const [mine, theirs] = bubbles(element);

    expect(mine.classList).toContain('bg-primary');
    expect(mine.parentElement?.classList).toContain('justify-end');
    expect(theirs.classList).toContain('bg-subtle');
    expect(theirs.parentElement?.classList).not.toContain('justify-end');
  });

  it('names the Giver only as "Tu Giver" for the screen reader', async () => {
    const element = (
      await render(
        {
          status: 'loaded',
          messages: [{ mine: false, text: '¿Qué talla usas?', sentOn: '2026-12-11' }],
          fresh: 0,
        },
        'RECEIVER',
        'Tu Giver',
      )
    ).nativeElement as HTMLElement;

    expect(text(bubbles(element)[0])).toBe('Tu Giver: ¿Qué talla usas?');
  });

  it('pops in only the Messages just sent', async () => {
    const element = (await render({ ...conversation, fresh: 1 })).nativeElement as HTMLElement;
    const pops = bubbles(element).map((bubble) =>
      bubble.classList.contains('motion-safe:animate-pop'),
    );

    expect(pops).toEqual([false, false, true]);
  });

  it('invites the Giver to write, restating that they stay anonymous', async () => {
    const element = (await render({ status: 'loaded', messages: [], fresh: 0 }))
      .nativeElement as HTMLElement;

    expect(text(element)).toContain('Aún no hay mensajes');
    expect(text(element)).toContain('no sabrá que eres tú');
    expect(element.querySelector('ol')).toBeNull();
  });

  it('invites the Receiver to write to someone they will never know', async () => {
    const element = (await render({ status: 'loaded', messages: [], fresh: 0 }, 'RECEIVER'))
      .nativeElement as HTMLElement;

    expect(text(element)).toContain('lo leerá sin que sepas quién es');
  });

  it('says it is loading', async () => {
    const element = (await render({ status: 'loading' })).nativeElement as HTMLElement;

    expect(text(element.querySelector('[role="status"]'))).toContain('Cargando mensajes');
  });

  it('offers to retry when the Messages cannot be loaded', async () => {
    const fixture = await render({ status: 'failed' });
    const element = fixture.nativeElement as HTMLElement;
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);

    expect(text(element.querySelector('[role="alert"]'))).toContain(
      'No hemos podido cargar los mensajes',
    );
    element.querySelector('button')?.click();
    expect(retried).toBe(1);
  });

  it('says plainly when the Mailbox is gone', async () => {
    const element = (await render({ status: 'not-found' })).nativeElement as HTMLElement;

    expect(text(element)).toContain('Este buzón ya no existe');
  });
});

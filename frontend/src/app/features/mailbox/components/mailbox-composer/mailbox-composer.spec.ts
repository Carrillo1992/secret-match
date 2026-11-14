import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MailboxComposer, SendStatus } from './mailbox-composer';

describe('MailboxComposer', () => {
  let fixture: ComponentFixture<MailboxComposer>;
  let sent: string[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(MailboxComposer);
    fixture.componentRef.setInput('id', 'composer-m-1');
    sent = [];
    fixture.componentInstance.send.subscribe((text) => sent.push(text));
    await fixture.whenStable();
  });

  const element = () => fixture.nativeElement as HTMLElement;
  const text = (node: Element | null | undefined) =>
    (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const textarea = () => element().querySelector('textarea') as HTMLTextAreaElement;
  const button = () => element().querySelector('button[type="submit"]') as HTMLButtonElement;
  const hint = () => element().querySelector('#composer-m-1-hint');
  const type = async (value: string) => {
    textarea().value = value;
    textarea().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async () => {
    button().click();
    await fixture.whenStable();
  };
  const report = async (status: SendStatus) => {
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
  };

  it('is a labelled textarea with a character count as its hint', () => {
    expect(element().querySelector('label[for="composer-m-1"]')).not.toBeNull();
    expect(textarea().id).toBe('composer-m-1');
    expect(textarea().getAttribute('aria-describedby')).toBe('composer-m-1-hint');
    expect(text(hint())).toBe('0/1000');
    expect(text(button())).toBe('Enviar');
  });

  it('refuses to send an empty Message and says why', async () => {
    await type('   ');
    await submit();

    expect(sent).toEqual([]);
    expect(text(hint())).toBe('Escribe algo antes de enviar.');
    expect(textarea().getAttribute('aria-invalid')).toBe('true');
  });

  it('treats no-break and zero-width spaces as nothing written, as the API does', async () => {
    await type('\u00a0\u200b\u2060 \n\ufeff');
    await submit();

    expect(sent).toEqual([]);
    expect(text(hint())).toBe('Escribe algo antes de enviar.');
  });

  it('has no maxlength, which would count UTF-16 units instead of characters', () => {
    expect(textarea().hasAttribute('maxlength')).toBe(false);
  });

  it('refuses 1001 characters, saying how many are left over', async () => {
    await type('a'.repeat(1001));

    expect(text(hint())).toBe('Te sobra 1 carácter (máximo 1000).');
    expect(textarea().getAttribute('aria-invalid')).toBe('true');
    await submit();
    expect(sent).toEqual([]);

    await type('a'.repeat(1002));
    expect(text(hint())).toBe('Te sobran 2 caracteres (máximo 1000).');
  });

  it('sends 1000 characters', async () => {
    await type('a'.repeat(1000));

    expect(text(hint())).toBe('1000/1000');
    expect(textarea().getAttribute('aria-invalid')).toBeNull();
    await submit();
    expect(sent).toEqual(['a'.repeat(1000)]);
  });

  it('counts characters as the API does, so an emoji is one', async () => {
    await type('🎁'.repeat(1000));

    expect(text(hint())).toBe('1000/1000');
    await submit();
    expect(sent).toHaveLength(1);
  });

  it('sends the text as written, as the API keeps it', async () => {
    await type('  ¿Qué talla usas?\n');
    await submit();

    expect(sent).toEqual(['  ¿Qué talla usas?\n']);
  });

  it('cannot send again while sending', async () => {
    await type('¡Hola!');
    await report('sending');

    expect(text(button())).toBe('Enviando…');
    expect(button().disabled).toBe(true);
  });

  it('keeps the text after a failed send', async () => {
    await type('¡Hola!');
    await submit();
    await report('sending');
    await report('failed');

    expect(text(element().querySelector('[role="alert"]'))).toBe(
      'No se ha enviado. Tu texto sigue aquí: inténtalo otra vez.',
    );
    expect(textarea().value).toBe('¡Hola!');
    expect(button().disabled).toBe(false);
  });

  it('says plainly when the Mailbox is gone, keeping the text', async () => {
    await type('¡Hola!');
    await report('not-found');

    expect(text(element().querySelector('[role="alert"]'))).toContain('Este buzón ya no existe');
    expect(textarea().value).toBe('¡Hola!');
  });

  it('says plainly when the API refuses the text, keeping it', async () => {
    await type('¡Hola!');
    await report('invalid');

    expect(text(element().querySelector('[role="alert"]'))).toBe(
      'No se ha enviado: el mensaje no puede estar vacío ni pasar de 1000 caracteres.',
    );
    expect(textarea().value).toBe('¡Hola!');
  });

  it('clears the text and announces the Message once sent', async () => {
    await type('¡Hola!');
    await submit();
    await report('sending');
    await report('sent');

    expect(textarea().value).toBe('');
    expect(text(hint())).toBe('0/1000');
    expect(text(element().querySelector('[aria-live="polite"]'))).toBe('Mensaje enviado.');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResendStatus } from '../../data-access/resend-verification';
import { ResendVerificationForm } from './resend-verification-form';

describe('ResendVerificationForm', () => {
  let fixture: ComponentFixture<ResendVerificationForm>;
  let page: HTMLElement;
  let requested: string[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(ResendVerificationForm);
    page = fixture.nativeElement as HTMLElement;
    requested = [];
    fixture.componentInstance.requested.subscribe((email) => requested.push(email));
    await fixture.whenStable();
  });

  const input = () => page.querySelector<HTMLInputElement>('#resend-email');
  const button = () => page.querySelector<HTMLButtonElement>('button[type="submit"]');
  const type = (value: string) => {
    const element = input();
    if (element) {
      element.value = value;
      element.dispatchEvent(new Event('input'));
    }
  };
  const submit = async () => {
    button()?.click();
    await fixture.whenStable();
  };
  const setStatus = async (status: ResendStatus) => {
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
  };

  it('starts with the email it is given', async () => {
    fixture.componentRef.setInput('initialEmail', 'ana@example.com');
    await fixture.whenStable();

    expect(input()?.value).toBe('ana@example.com');
  });

  it('asks for a link for the typed email', async () => {
    type(' ana@example.com ');
    await submit();

    expect(requested).toEqual(['ana@example.com']);
  });

  it('says what is wrong with the email and asks for nothing', async () => {
    await submit();
    expect(page.textContent).toContain('Escribe tu correo');

    type('ana-at-example');
    await submit();
    expect(page.textContent).toContain('no parece un correo');
    expect(requested).toEqual([]);
  });

  it('cannot ask again while a request is being sent', async () => {
    await setStatus('sending');
    type('ana@example.com');

    expect(button()?.disabled).toBe(true);
  });

  it('confirms without saying whether the email has an account', async () => {
    await setStatus('sent');

    expect(page.querySelector('[role="status"]')?.textContent).toContain(
      'Si ese correo tiene una cuenta pendiente de confirmar',
    );
  });

  it('says when the link could not be sent', async () => {
    await setStatus('failed');

    expect(page.querySelector('[role="status"]')?.textContent).toContain('No hemos podido enviar');
  });
});

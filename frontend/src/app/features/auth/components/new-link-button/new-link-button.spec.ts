import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewLinkStatus } from '../../data-access/new-verification-link';
import { NewLinkButton } from './new-link-button';

describe('NewLinkButton', () => {
  let fixture: ComponentFixture<NewLinkButton>;
  let page: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(NewLinkButton);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const button = () => page.querySelector('button');
  const status = () => page.querySelector('[role="status"]')?.textContent ?? '';
  const setStatus = async (value: NewLinkStatus) => {
    fixture.componentRef.setInput('status', value);
    await fixture.whenStable();
  };

  it('asks for a new link when pressed', () => {
    let requests = 0;
    fixture.componentInstance.requested.subscribe(() => requests++);

    button()?.click();

    expect(requests).toBe(1);
  });

  it('cannot be pressed again while a request is being sent', async () => {
    await setStatus('sending');

    expect(button()?.disabled).toBe(true);
    expect(button()?.textContent).toContain('Enviando');
  });

  it('confirms without saying whether the email has an account', async () => {
    await setStatus('sent');

    expect(status()).toContain('Te hemos enviado un enlace nuevo');
    expect(status()).toContain('puede que ese correo ya tenga una cuenta');
  });

  it('says when the link could not be sent', async () => {
    await setStatus('failed');

    expect(status()).toContain('No hemos podido enviar');
  });
});

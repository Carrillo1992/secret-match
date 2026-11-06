import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';

@Component({
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button id="default" appButton type="button" class="mt-6 w-full">Crear cuenta</button>
    <button id="secondary" appButton="secondary" type="button">Reintentar</button>
    <a id="link" appButton href="/">Ir al inicio</a>
  `,
})
class Host {}

describe('Button', () => {
  let page: HTMLElement;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const classesOf = (id: string) => page.querySelector(`#${id}`)?.classList;

  it('is the primary button when no variant is given', () => {
    expect(classesOf('default')).toContain('bg-primary');
    expect(classesOf('default')).toContain('h-14');
    expect(classesOf('default')).not.toContain('border-primary');
  });

  it('is the outlined secondary button when asked for', () => {
    expect(classesOf('secondary')).toContain('border-primary');
    expect(classesOf('secondary')).toContain('h-12');
    expect(classesOf('secondary')).not.toContain('bg-primary');
  });

  it('keeps the classes the screen adds for placement', () => {
    expect(classesOf('default')).toContain('mt-6');
    expect(classesOf('default')).toContain('w-full');
  });

  it('dims either variant while disabled', () => {
    expect(classesOf('default')).toContain('disabled:opacity-60');
    expect(classesOf('secondary')).toContain('disabled:opacity-60');
  });

  it('styles a link as a button too', () => {
    expect(classesOf('link')).toContain('bg-primary');
  });
});

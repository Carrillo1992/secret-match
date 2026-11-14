import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TextLink } from './text-link';

@Component({
  imports: [TextLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Mira en spam o <a id="inline" appLink href="/sign-up">vuelve a registrarte</a>.</p>
    <p class="text-center"><a id="standalone" appLink standalone href="/">Volver al inicio</a></p>
    <button id="danger" type="button" appLink tone="danger">Añadir</button>
  `,
})
class Host {}

describe('TextLink', () => {
  let page: HTMLElement;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const classesOf = (id: string) => page.querySelector(`#${id}`)?.classList;

  it('is an underlined primary-coloured link', () => {
    expect(classesOf('inline')).toContain('text-primary');
    expect(classesOf('inline')).toContain('underline');
  });

  it('stays inside the sentence when it is part of one', () => {
    expect(classesOf('inline')).not.toContain('min-h-11');
    expect(classesOf('inline')).not.toContain('inline-flex');
  });

  it('gets a 44 px touch target when it stands on its own line', () => {
    expect(classesOf('standalone')).toContain('min-h-11');
    expect(classesOf('standalone')).toContain('inline-flex');
    expect(classesOf('standalone')).toContain('text-primary');
  });

  it('takes the danger tone on a danger-soft card, where primary falls below AA', () => {
    expect(classesOf('danger')).toContain('text-danger');
    expect(classesOf('danger')).not.toContain('text-primary');
    expect(classesOf('danger')).toContain('focus-visible:outline-danger');
  });
});

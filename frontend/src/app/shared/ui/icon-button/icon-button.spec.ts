import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IconButton } from './icon-button';

@Component({
  imports: [IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      id="plain"
      type="button"
      appIconButton
      aria-label="Preferencias"
      class="ml-auto"
    ></button>
    <button id="raised" type="button" appIconButton="raised" aria-label="Preferencias"></button>
  `,
})
class Host {}

describe('IconButton', () => {
  let page: HTMLElement;

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const classesOf = (id: string) => page.querySelector(`#${id}`)?.classList;

  it('is a round 44 px touch target with a visible focus ring', () => {
    expect(classesOf('plain')).toContain('size-11');
    expect(classesOf('plain')).toContain('rounded-full');
    expect(classesOf('plain')).toContain('focus-visible:outline-primary');
  });

  it('sits flat on the bar unless raised', () => {
    expect(classesOf('plain')).not.toContain('bg-surface');
    expect(classesOf('raised')).toContain('bg-surface');
    expect(classesOf('raised')).toContain('shadow-card');
  });

  it('keeps the classes the screen adds for placement', () => {
    expect(classesOf('plain')).toContain('ml-auto');
  });
});

// PROTOTYPE (#118), throwaway: variant A's iOS guide, expanded in place (confirm-panel shape).
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TextLink } from '../../../shared/ui/text-link/text-link';
import { ProtoIosGuideSteps } from './ios-guide-steps';

@Component({
  selector: 'app-proto-guide-well',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProtoIosGuideSteps, TextLink],
  host: { class: 'block rounded-field bg-canvas p-4 text-left' },
  template: `
    <h3 #heading [id]="headingId()" tabindex="-1" class="font-bold focus:outline-none">
      Instalar SecretMatch
    </h3>
    <app-proto-ios-guide-steps look="well" />
    <div class="mt-3">
      <button type="button" appLink standalone (click)="done.emit()">Entendido</button>
    </div>
  `,
})
export class ProtoGuideWell {
  readonly headingId = input.required<string>();
  /** "Entendido": the host collapses the well and gives focus back to the opener. */
  readonly done = output();

  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }
}

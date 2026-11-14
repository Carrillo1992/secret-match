import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Where the envelope stands: sealed, opening right now, or open with its flap folded back. */
export type EnvelopeState = 'closed' | 'opening' | 'open';

/**
 * The flat envelope of the Reveal (#30), pure decoration: a back, a letter, a front pocket, a flap
 * that turns over in 3D and a mustard wax seal. Its width comes from the host (`class="w-50"`); the
 * height follows. The shapes need `clip-path` and 3D transforms, which Tailwind cannot express, so
 * they live in component styles; the motion is the `animate-*` tokens, behind `motion-safe:`.
 */
@Component({
  selector: 'app-envelope',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'aria-hidden': 'true' },
  styles: `
    .envelope {
      position: relative;
      aspect-ratio: 3 / 2;
      perspective: 700px;
    }
    .envelope > * {
      position: absolute;
    }
    .back {
      inset: 0;
      border-radius: 10px;
    }
    .letter {
      inset: 6% 8%;
      z-index: 2;
      border-radius: 6px;
      padding: 12% 10%;
      display: flex;
      flex-direction: column;
      gap: 9%;
    }
    .letter i {
      display: block;
      height: 6px;
      border-radius: 3px;
      background: var(--color-line);
      opacity: 0.4;
    }
    /* The shadows sit on a wrapper: a clipped element would clip its own shadow away. */
    .front {
      inset: 0;
      z-index: 3;
      filter: drop-shadow(0 -2px 0 rgb(0 0 0 / 0.12));
    }
    .front > div {
      position: absolute;
      inset: 0;
      border-radius: 10px;
      clip-path: polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%);
    }
    .flap {
      inset: 0 0 auto;
      height: 58%;
      z-index: 4;
      transform-origin: 50% 0;
      filter: drop-shadow(0 2px 1px rgb(0 0 0 / 0.2));
    }
    .flap > div {
      position: absolute;
      inset: 0;
      border-radius: 10px 10px 0 0;
      clip-path: polygon(0 0, 100% 0, 50% 100%);
    }
    .seal {
      left: 50%;
      top: 58%;
      width: 18%;
      aspect-ratio: 1;
      z-index: 5;
      border-radius: 9999px;
      transform: translate(-50%, -50%);
      box-shadow: inset 0 0 0 3px rgb(0 0 0 / 0.1);
    }
    .is-open .flap {
      transform: rotateX(180deg);
      z-index: 1;
    }
    .is-open .seal {
      opacity: 0;
    }
    .is-open .letter {
      transform: translateY(-48%);
    }
  `,
  template: `
    <div class="envelope" [class.is-open]="state() !== 'closed'">
      <div class="back bg-primary-hover"></div>
      @if (letter()) {
        <div
          class="letter bg-surface"
          [class]="{ 'motion-safe:animate-letter-peek': state() === 'opening' }"
        >
          <i></i><i class="w-2/3"></i><i class="w-5/6"></i>
        </div>
      }
      <div class="front"><div class="bg-primary"></div></div>
      <div class="flap" [class]="{ 'motion-safe:animate-flap-open': state() === 'opening' }">
        <div class="bg-primary"></div>
      </div>
      <div
        class="seal bg-mustard"
        [class]="{ 'motion-safe:animate-seal-pop': state() === 'opening' }"
      ></div>
    </div>
  `,
})
export class Envelope {
  readonly state = input<EnvelopeState>('closed');
  /** Whether the letter shows inside: once revealed, the letter is drawn apart, holding the name. */
  readonly letter = input(true);
}

import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the bottom sheet chosen in #87 (option B): a native modal `<dialog>` that rises
 * from the bottom on phones and is a centred card from `sm`. To be built in #87; see the design
 * comment on the issue.
 */
@Component({
  selector: 'app-bottom-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
})
export class BottomSheet {}

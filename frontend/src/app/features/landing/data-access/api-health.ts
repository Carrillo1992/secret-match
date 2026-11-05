import { computed, inject, Injectable, resource } from '@angular/core';
import { Api } from '../../../core/api/generated/api';
import { health } from '../../../core/api/generated/functions';

export type ApiHealthStatus = 'checking' | 'up' | 'down';

/**
 * The API's health, checked once when the service is created.
 * Provide it at the component that shows it, so each visit checks again.
 */
@Injectable()
export class ApiHealth {
  private readonly api = inject(Api);
  private readonly health = resource({ loader: () => this.api.invoke(health) });

  readonly status = computed<ApiHealthStatus>(() => {
    if (this.health.isLoading()) {
      return 'checking';
    }
    // An unreachable API and one answering 503 DOWN both end up here.
    return this.health.hasValue() && this.health.value().status === 'UP' ? 'up' : 'down';
  });

  recheck(): void {
    this.health.reload();
  }
}

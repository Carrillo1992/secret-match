import { httpResource } from '@angular/common/http';
import { computed, inject, Signal } from '@angular/core';
import { APP_CONFIG } from '../../../core/config/app-config';

/**
 * Shape of Spring Boot Actuator's `/actuator/health`. Actuator is not part of the
 * OpenAPI document, so this one type is hand-written rather than generated.
 */
interface HealthResponse {
  readonly status: string;
}

export type ApiHealthStatus = 'checking' | 'up' | 'down';

export interface ApiHealth {
  readonly status: Signal<ApiHealthStatus>;
  recheck(): void;
}

/** Checks the API's health once on creation. Must run in an injection context. */
export function injectApiHealth(): ApiHealth {
  const { apiBaseUrl } = inject(APP_CONFIG);
  const health = httpResource<HealthResponse>(() => `${apiBaseUrl}/actuator/health`);

  const status = computed<ApiHealthStatus>(() => {
    if (health.isLoading()) {
      return 'checking';
    }
    // An unreachable API and one answering 503 DOWN both end up here.
    return health.hasValue() && health.value().status === 'UP' ? 'up' : 'down';
  });

  return { status, recheck: () => health.reload() };
}

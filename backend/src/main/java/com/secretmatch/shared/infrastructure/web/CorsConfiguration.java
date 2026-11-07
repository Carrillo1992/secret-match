package com.secretmatch.shared.infrastructure.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Only the SPA may call the API from a browser (docs/architecture.md §2.4), with credentials, so the
 * refresh token cookie reaches the session endpoints.
 */
@Configuration(proxyBeanMethods = false)
class CorsConfiguration implements WebMvcConfigurer {

    private final String allowedOrigin;

    CorsConfiguration(@Value("${secretmatch.web.allowed-origin}") String allowedOrigin) {
        this.allowedOrigin = allowedOrigin;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigin)
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowCredentials(true);
    }
}

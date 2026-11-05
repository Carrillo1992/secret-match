package com.secretmatch.shared.domain;

/**
 * A business rule was broken. Each subclass is one error kind with a stable {@code code} (kebab-case),
 * which the API exposes as the problem {@code type}.
 *
 * <p>The message is shown to the caller as the problem {@code detail}, so it must never contain giver
 * identities, message bodies, emails or tokens.
 */
public abstract class DomainException extends RuntimeException {

    private final String code;

    protected DomainException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}

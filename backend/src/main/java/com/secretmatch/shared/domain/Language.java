package com.secretmatch.shared.domain;

import java.util.Arrays;

/**
 * The Language a User reads SecretMatch and its emails in. Stored and transported as its code. Shared, because every
 * module that emails a User writes that email in the User's Language (ADR 0003, ADR 0005).
 */
public enum Language {
    SPANISH("es"),
    ENGLISH("en");

    private final String code;

    Language(String code) {
        this.code = code;
    }

    /** The ISO 639-1 code: {@code es} or {@code en}. */
    public String code() {
        return code;
    }

    /**
     * @throws UnsupportedLanguageException if no Language has this code
     */
    public static Language ofCode(String code) {
        return Arrays.stream(values())
                .filter(language -> language.code.equals(code))
                .findFirst()
                .orElseThrow(UnsupportedLanguageException::new);
    }
}

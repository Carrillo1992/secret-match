package com.secretmatch.identity.domain;

import java.util.Arrays;

/** The Language a User reads SecretMatch and its emails in. Stored and transported as its code. */
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
     * @throws InvalidUserDetailsException if no Language has this code
     */
    public static Language ofCode(String code) {
        return Arrays.stream(values())
                .filter(language -> language.code.equals(code))
                .findFirst()
                .orElseThrow(InvalidUserDetailsException::language);
    }
}

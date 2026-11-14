package com.secretmatch.shared.domain;

/** A Language code that is neither {@code es} nor {@code en}. The message never repeats the value. */
public class UnsupportedLanguageException extends DomainException {

    UnsupportedLanguageException() {
        super("invalid-language", "The language must be es or en.");
    }
}

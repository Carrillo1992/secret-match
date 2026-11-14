package com.secretmatch.notification.application;

import com.secretmatch.shared.domain.Language;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

/**
 * The layout every SecretMatch email shares, in the email's Language: sender, branding, a link into the app and a
 * footer.
 */
@Component
class BaseEmailTemplate {

    private static final String SENDER_NAME = "SecretMatch";

    /** The template's own words in one Language. */
    private record Copy(String callToAction, String footer) {

        static Copy in(Language language) {
            return switch (language) {
                case SPANISH ->
                    new Copy(
                            "Abrir SecretMatch",
                            "Este correo lo envía SecretMatch automáticamente. No respondas a este mensaje.");
                case ENGLISH ->
                    new Copy(
                            "Open SecretMatch",
                            "This email is sent automatically by SecretMatch. Please do not reply to it.");
            };
        }
    }

    private final MailProperties properties;

    BaseEmailTemplate(MailProperties properties) {
        this.properties = properties;
    }

    OutgoingEmail render(EmailRequested request) {
        String link = linkTo(request.linkPath());
        Copy copy = Copy.in(request.language());
        return new OutgoingEmail(
                SENDER_NAME,
                properties.fromAddress(),
                request.recipient(),
                request.subject(),
                html(request, copy, link),
                text(request, copy, link));
    }

    private String linkTo(String path) {
        String base = properties.appBaseUrl().toString();
        return (base.endsWith("/") ? base.substring(0, base.length() - 1) : base) + path;
    }

    private static String html(EmailRequested request, Copy copy, String link) {
        String paragraphs = Arrays.stream(request.message().split("\\R\\s*\\R"))
                .map(paragraph -> "<p style=\"margin:0 0 16px;\">" + escape(paragraph.strip()) + "</p>")
                .collect(Collectors.joining("\n"));
        return """
                <!doctype html>
                <html lang="%s">
                <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%s</title>
                </head>
                <body style="margin:0;padding:24px;background:#f6f4f1;font-family:Arial,Helvetica,sans-serif;\
                color:#1f2937;font-size:16px;line-height:1.5;">
                <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
                <p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#b91c1c;">%s</p>
                %s
                <p style="margin:32px 0;"><a href="%s" style="display:inline-block;background:#b91c1c;color:#ffffff;\
                padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">%s</a></p>
                <p style="margin:0;font-size:12px;color:#6b7280;">%s</p>
                </div>
                </body>
                </html>
                """.formatted(
                        request.language().code(),
                        escape(request.subject()),
                        SENDER_NAME,
                        paragraphs,
                        escape(link),
                        copy.callToAction(),
                        copy.footer());
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value, "UTF-8");
    }

    private static String text(EmailRequested request, Copy copy, String link) {
        return request.message().strip() + "\n\n" + copy.callToAction() + ": " + link + "\n\n--\n" + copy.footer()
                + "\n";
    }
}

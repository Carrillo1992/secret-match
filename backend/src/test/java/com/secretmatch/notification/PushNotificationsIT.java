package com.secretmatch.notification;

import static org.assertj.core.api.Assertions.assertThat;

import com.secretmatch.RecordingEmailSender;
import com.secretmatch.RecordingPushSender;
import com.secretmatch.TestPostgres;
import com.secretmatch.notification.application.PushDeliveryException;
import com.secretmatch.notification.application.PushRequested;
import com.secretmatch.notification.application.PushUrgency;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Ticket #119: a User turns notifications on for a device, and gets pushes there once the action commits. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
@ActiveProfiles("test")
@Import({TestPostgres.class, RecordingPushSender.Config.class})
@ExtendWith(OutputCaptureExtension.class)
class PushNotificationsIT {

    private static final String PASSWORD = "turrón-y-polvorones";
    private static final Pattern LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    // A browser's keys, from RFC 8291 Appendix A: the recorder never encrypts, any well-formed pair will do.
    private static final String P256DH =
            "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
    private static final String AUTH = "BTBZMqHH6r4Tts7J_aSIgg";

    @Autowired
    RestTestClient http;

    @Autowired
    RecordingEmailSender mail;

    @Autowired
    RecordingPushSender pushes;

    @Autowired
    ApplicationEventPublisher events;

    @Autowired
    TransactionTemplate transaction;

    @BeforeEach
    @AfterEach
    void reset() {
        pushes.clear();
    }

    @Test
    @DisplayName("anyone can read the public key browsers subscribe with")
    void publicKey() {
        http.get()
                .uri("/api/v1/push/public-key")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.publicKey")
                .isEqualTo(RecordingPushSender.PUBLIC_KEY);
    }

    @Test
    @DisplayName("a push for a User reaches each of their devices once the transaction commits, nobody else's")
    void reachesEveryDeviceOfTheRecipient() {
        User ana = signedInUser("Ana");
        User luis = signedInUser("Luis");
        URI anasPhone = subscribe(ana, newEndpoint());
        URI anasLaptop = subscribe(ana, "https://updates.push.services.mozilla.com/wpush/v2/" + UUID.randomUUID());
        URI luisPhone = subscribe(luis, newEndpoint());

        transaction.executeWithoutResult(status -> {
            events.publishEvent(newMessageFor(ana));
            assertThat(pushes.sent()).as("nothing is pushed before the commit").isEmpty();
        });

        assertThat(pushes.sent())
                .extracting(RecordingPushSender.Push::endpoint)
                .containsExactlyInAnyOrder(anasPhone, anasLaptop)
                .doesNotContain(luisPhone);
    }

    @Test
    @DisplayName("nothing is pushed for a change that rolls back")
    void notPushedOnRollback() {
        User ana = signedInUser("Ana");
        subscribe(ana, newEndpoint());

        transaction.executeWithoutResult(status -> {
            events.publishEvent(newMessageFor(ana));
            status.setRollbackOnly();
        });

        assertThat(pushes.sent()).isEmpty();
    }

    @Test
    @DisplayName("the push carries the text, the link, an opaque topic, three days to live and the urgency")
    void whatIsPushed() {
        User ana = signedInUser("Ana");
        URI phone = subscribe(ana, newEndpoint());
        String mailbox = UUID.randomUUID().toString();

        publish(new PushRequested(
                ana.id(),
                "Mensaje nuevo",
                "Tienes un mensaje nuevo en «Navidad»",
                "/groups/g1",
                mailbox,
                PushUrgency.HIGH));
        publish(new PushRequested(
                ana.id(),
                "Mensaje nuevo",
                "Tienes un mensaje nuevo en «Navidad»",
                "/groups/g1",
                mailbox,
                PushUrgency.HIGH));

        assertThat(pushes.sentTo(phone)).hasSize(2).allSatisfy(push -> {
            assertThat(push.message().title()).isEqualTo("Mensaje nuevo");
            assertThat(push.message().body()).isEqualTo("Tienes un mensaje nuevo en «Navidad»");
            assertThat(push.message().linkPath()).isEqualTo("/groups/g1");
            assertThat(push.message().urgency()).isEqualTo(PushUrgency.HIGH);
            assertThat(push.message().timeToLive()).isEqualTo(Duration.ofDays(3));
            assertThat(push.message().topic())
                    .as("a push service Topic: at most 32 base64url characters, never the thread itself")
                    .matches("[A-Za-z0-9_-]{1,32}")
                    .doesNotContain(mailbox.substring(0, 8));
        });
        assertThat(pushes.sentTo(phone).get(0).message().topic())
                .as("the same thread, the same topic, so the newer one replaces the older")
                .isEqualTo(pushes.sentTo(phone).get(1).message().topic());
    }

    @Test
    @DisplayName("each thread gets its own topic")
    void topicsPerThread() {
        User ana = signedInUser("Ana");
        URI phone = subscribe(ana, newEndpoint());

        publish(newMessageFor(ana));
        publish(newMessageFor(ana));

        assertThat(pushes.sentTo(phone))
                .extracting(push -> push.message().topic())
                .doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("subscribing an endpoint another User had moves it to the new User: the device is theirs now")
    void subscribingMovesTheDevice() {
        User ana = signedInUser("Ana");
        User luis = signedInUser("Luis");
        String sharedTablet = newEndpoint();
        subscribe(ana, sharedTablet);

        subscribe(luis, sharedTablet);
        publish(newMessageFor(ana));
        publish(newMessageFor(luis));

        assertThat(pushes.sent())
                .singleElement()
                .satisfies(push -> assertThat(push.message().linkPath()).isEqualTo("/groups/" + luis.id()));
    }

    @Test
    @DisplayName("subscribing the same endpoint again keeps one subscription")
    void subscribingAgainKeepsOne() {
        User ana = signedInUser("Ana");
        String phone = newEndpoint();
        subscribe(ana, phone);
        subscribe(ana, phone);

        publish(newMessageFor(ana));

        assertThat(pushes.sent()).hasSize(1);
    }

    @Test
    @DisplayName("a User can turn a device off; turning off someone else's endpoint changes nothing")
    void unsubscribing() {
        User ana = signedInUser("Ana");
        User luis = signedInUser("Luis");
        URI anasPhone = subscribe(ana, newEndpoint());
        URI luisPhone = subscribe(luis, newEndpoint());

        unsubscribe(ana, anasPhone.toString()).expectStatus().isNoContent();
        unsubscribe(ana, luisPhone.toString()).expectStatus().isNoContent();
        publish(newMessageFor(ana));
        publish(newMessageFor(luis));

        assertThat(pushes.sent()).extracting(RecordingPushSender.Push::endpoint).containsExactly(luisPhone);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "http://fcm.googleapis.com/fcm/send/abc",
                "https://evil.example/fcm.googleapis.com",
                "https://fcm.googleapis.com.evil.example/x",
                "https://localhost/x",
                "https://169.254.169.254/latest",
                "https://fcm.googleapis.com:8443/x",
                "https://user@fcm.googleapis.com/x",
                "not a url"
            })
    @DisplayName("only endpoints of the browsers' push services, over HTTPS, are accepted")
    void refusesOtherEndpoints(String endpoint) {
        User ana = signedInUser("Ana");

        put(ana, Map.of("endpoint", endpoint, "keys", Map.of("p256dh", P256DH, "auth", AUTH)))
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.type")
                .isEqualTo("urn:secretmatch:problem:invalid-push-subscription");
    }

    @Test
    @DisplayName("keys that are not what the Push API produces are refused")
    void refusesBadKeys() {
        User ana = signedInUser("Ana");

        put(ana, Map.of("endpoint", newEndpoint(), "keys", Map.of("p256dh", AUTH, "auth", AUTH)))
                .expectStatus()
                .isEqualTo(422);
        put(ana, Map.of("endpoint", newEndpoint(), "keys", Map.of("p256dh", P256DH)))
                .expectStatus()
                .isBadRequest();
    }

    @Test
    @DisplayName("subscribing needs a signed-in User")
    void needsASession() {
        http.put()
                .uri("/api/v1/push-subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("endpoint", newEndpoint(), "keys", Map.of("p256dh", P256DH, "auth", AUTH)))
                .exchange()
                .expectStatus()
                .isUnauthorized();
    }

    @Test
    @DisplayName("a subscription the push service no longer knows is forgotten")
    void forgetsGoneSubscriptions() {
        User ana = signedInUser("Ana");
        URI oldPhone = subscribe(ana, newEndpoint());
        URI newPhone = subscribe(ana, newEndpoint());
        pushes.forget(oldPhone);
        publish(newMessageFor(ana));
        pushes.clear();

        publish(newMessageFor(ana));

        assertThat(pushes.sent()).extracting(RecordingPushSender.Push::endpoint).containsExactly(newPhone);
    }

    @Test
    @DisplayName("a failed push is logged without the endpoint or the text, and the other devices still get theirs")
    void failuresAreLoggedAndContained(CapturedOutput output) {
        User ana = signedInUser("Ana");
        URI phone = subscribe(ana, newEndpoint());
        pushes.failSendsWith(new PushDeliveryException("push service answered HTTP 413"));

        publish(newMessageFor(ana));

        assertThat(pushes.sent()).isEmpty();
        assertThat(output.getOut())
                .contains("Push not delivered: push service answered HTTP 413")
                .doesNotContain(phone.toString())
                .doesNotContain("Tienes un mensaje nuevo");
    }

    @Test
    @DisplayName("a deleted User's devices are forgotten with them")
    void deletedUsersDevicesGo() {
        User ana = signedInUser("Ana");
        subscribe(ana, newEndpoint());

        http.delete()
                .uri("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + ana.accessToken())
                .exchange()
                .expectStatus()
                .isNoContent();
        publish(newMessageFor(ana));

        assertThat(pushes.sent()).isEmpty();
    }

    /** A new Message for {@code user} in a Mailbox of its own; it links to a path naming the User, to tell them apart. */
    private static PushRequested newMessageFor(User user) {
        return new PushRequested(
                user.id(),
                "Mensaje nuevo",
                "Tienes un mensaje nuevo en «Navidad»",
                "/groups/" + user.id(),
                UUID.randomUUID().toString(),
                PushUrgency.HIGH);
    }

    private void publish(PushRequested request) {
        transaction.executeWithoutResult(status -> events.publishEvent(request));
    }

    private static String newEndpoint() {
        return "https://fcm.googleapis.com/fcm/send/" + UUID.randomUUID();
    }

    private URI subscribe(User user, String endpoint) {
        put(user, Map.of("endpoint", endpoint, "keys", Map.of("p256dh", P256DH, "auth", AUTH)))
                .expectStatus()
                .isNoContent();
        return URI.create(endpoint);
    }

    private RestTestClient.ResponseSpec put(User user, Map<String, ?> body) {
        return http.put()
                .uri("/api/v1/push-subscriptions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }

    private RestTestClient.ResponseSpec unsubscribe(User user, String endpoint) {
        return http.method(org.springframework.http.HttpMethod.DELETE)
                .uri("/api/v1/push-subscriptions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + user.accessToken())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("endpoint", endpoint))
                .exchange();
    }

    record User(String accessToken, UUID id) {}

    /** Signs up, verifies and signs in a new User. */
    private User signedInUser(String displayName) {
        String email = "user-" + UUID.randomUUID() + "@example.com";
        anonymousPost(
                        "/api/v1/sign-ups",
                        Map.of("email", email, "displayName", displayName, "password", PASSWORD, "language", "es"))
                .expectStatus()
                .isAccepted();
        Matcher matcher = LINK.matcher(mail.sentTo(email).getLast().text());
        assertThat(matcher.find()).isTrue();
        anonymousPost("/api/v1/email-verifications", Map.of("token", matcher.group(1)))
                .expectStatus()
                .isNoContent();
        RestTestClient.ResponseSpec signIn =
                anonymousPost("/api/v1/sessions", Map.of("email", email, "password", PASSWORD));
        String accessToken = JSON.readTree(
                        signIn.expectBody(String.class).returnResult().getResponseBody())
                .get("accessToken")
                .asString();
        return new User(accessToken, subjectOf(accessToken));
    }

    private static UUID subjectOf(String accessToken) {
        String claims = new String(Base64.getUrlDecoder().decode(accessToken.split("\\.")[1]), StandardCharsets.UTF_8);
        JsonNode node = JSON.readTree(claims);
        return UUID.fromString(node.get("sub").asString());
    }

    private RestTestClient.ResponseSpec anonymousPost(String path, Map<String, ?> body) {
        return http.post()
                .uri(path)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .exchange();
    }
}

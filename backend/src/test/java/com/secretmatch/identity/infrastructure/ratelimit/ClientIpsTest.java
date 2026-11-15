package com.secretmatch.identity.infrastructure.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpsTest {

    @Test
    @DisplayName("with no proxy in front, the client is the remote address, whatever X-Forwarded-For says")
    void noProxy() {
        assertThat(new ClientIps(0).of(request("10.0.0.5", "203.0.113.7"))).isEqualTo("10.0.0.5");
    }

    @Test
    @DisplayName("behind two proxies, the client is the entry the first proxy appended, second from the right")
    void twoProxies() {
        assertThat(new ClientIps(2).of(request("10.21.157.68", "203.0.113.7, 104.22.17.40")))
                .isEqualTo("203.0.113.7");
    }

    @Test
    @DisplayName("a client that sends its own X-Forwarded-For entries cannot choose its IP")
    void spoofedEntriesAreIgnored() {
        assertThat(new ClientIps(2).of(request("10.21.157.68", "1.1.1.1, 2.2.2.2 ,203.0.113.7,104.22.17.40")))
                .isEqualTo("203.0.113.7");
    }

    @Test
    @DisplayName("fewer entries than proxies means the request did not come through them: the remote address counts")
    void tooFewEntries() {
        assertThat(new ClientIps(2).of(request("10.21.157.68", "104.22.17.40"))).isEqualTo("10.21.157.68");
        assertThat(new ClientIps(2).of(request("10.21.157.68", null))).isEqualTo("10.21.157.68");
    }

    @Test
    @DisplayName("several X-Forwarded-For headers read as one list, in order")
    void severalHeaders() {
        MockHttpServletRequest request = request("10.21.157.68", "1.1.1.1");
        request.addHeader("X-Forwarded-For", "203.0.113.7, 104.22.17.40");

        assertThat(new ClientIps(2).of(request)).isEqualTo("203.0.113.7");
    }

    private static MockHttpServletRequest request(String remoteAddress, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddress);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }
}

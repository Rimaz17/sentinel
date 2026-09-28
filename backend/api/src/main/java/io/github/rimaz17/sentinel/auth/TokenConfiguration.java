package io.github.rimaz17.sentinel.auth;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

/**
 * The API signs its own access tokens and checks them on every request. There is no external
 * identity provider, so one symmetric key both signs and verifies (HMAC with SHA-256).
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AuthProperties.class)
class TokenConfiguration {

  @Bean
  JwtEncoder jwtEncoder(AuthProperties properties) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(key(properties)));
  }

  @Bean
  JwtDecoder jwtDecoder(AuthProperties properties) {
    NimbusJwtDecoder decoder =
        NimbusJwtDecoder.withSecretKey(key(properties)).macAlgorithm(MacAlgorithm.HS256).build();
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefault(), new JwtIssuerValidator(AccessTokens.ISSUER)));
    return decoder;
  }

  /** A token's role claim becomes the authority {@code ROLE_<role>}, as hasRole expects. */
  @Bean
  JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
    authorities.setAuthoritiesClaimName(AccessTokens.ROLE_CLAIM);
    authorities.setAuthorityPrefix("ROLE_");
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(authorities);
    return converter;
  }

  private static SecretKey key(AuthProperties properties) {
    return new SecretKeySpec(properties.secretBytes(), "HmacSHA256");
  }
}

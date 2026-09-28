package io.github.rimaz17.sentinel.auth;

import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * The API's security rules. Stateless: nothing is kept in a server session, so every request
 * carries its own identity, either an access token or the report feed's key.
 */
@Configuration(proxyBeanMethods = false)
class SecurityConfiguration {

  static final int MIN_FEED_KEY_BYTES = 32;

  @Bean
  SecurityFilterChain api(HttpSecurity http, @Value("${sentinel.feed.key:}") String feedKey)
      throws Exception {
    if (!feedKey.isEmpty()
        && feedKey.getBytes(StandardCharsets.UTF_8).length < MIN_FEED_KEY_BYTES) {
      throw new IllegalStateException(
          "SENTINEL_FEED_KEY must be at least 32 bytes, or unset to switch the report feed off");
    }
    SecurityProblems problems = new SecurityProblems();
    return http.csrf(AbstractHttpConfigurer::disable)
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .logout(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .addFilterBefore(new FeedKeyFilter(feedKey), BearerTokenAuthenticationFilter.class)
        .authorizeHttpRequests(
            requests ->
                requests
                    .requestMatchers("/api/auth/me")
                    .authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/ingestion/reports")
                    .hasAnyAuthority("ROLE_DATA_PROVIDER", FeedAuthentication.AUTHORITY)
                    .anyRequest()
                    .permitAll())
        .oauth2ResourceServer(
            server -> server.jwt(Customizer.withDefaults()).authenticationEntryPoint(problems))
        .exceptionHandling(
            exceptions ->
                exceptions.authenticationEntryPoint(problems).accessDeniedHandler(problems))
        .build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}

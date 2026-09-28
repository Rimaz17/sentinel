package io.github.rimaz17.sentinel.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * The API's security rules. Stateless: nothing is kept in a server session, so every request
 * carries its own identity.
 */
@Configuration(proxyBeanMethods = false)
class SecurityConfiguration {

  @Bean
  SecurityFilterChain api(HttpSecurity http) throws Exception {
    return http.csrf(AbstractHttpConfigurer::disable)
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .logout(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
        .oauth2ResourceServer(server -> server.jwt(Customizer.withDefaults()))
        .build();
  }
}

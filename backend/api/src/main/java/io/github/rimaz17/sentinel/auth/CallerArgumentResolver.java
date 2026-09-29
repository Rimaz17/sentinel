package io.github.rimaz17.sentinel.auth;

import io.github.rimaz17.sentinel.web.ApiProblem;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Supplies a controller's {@link Caller} parameter from the authenticated request. */
@Configuration(proxyBeanMethods = false)
class CallerArgumentResolver implements HandlerMethodArgumentResolver, WebMvcConfigurer {

  @Override
  public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
    resolvers.add(this);
  }

  @Override
  public boolean supportsParameter(MethodParameter parameter) {
    return Caller.class.isAssignableFrom(parameter.getParameterType());
  }

  @Override
  public Object resolveArgument(
      MethodParameter parameter,
      ModelAndViewContainer container,
      NativeWebRequest request,
      WebDataBinderFactory binderFactory) {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    Caller caller;
    if (authentication instanceof JwtAuthenticationToken jwt) {
      caller = Caller.Staff.from(jwt.getToken());
    } else if (authentication instanceof FeedAuthentication) {
      caller = new Caller.Feed();
    } else {
      throw new ApiProblem(HttpStatus.UNAUTHORIZED, SecurityProblems.SIGN_IN);
    }
    if (!parameter.getParameterType().isInstance(caller)) {
      throw new ApiProblem(HttpStatus.FORBIDDEN, SecurityProblems.NOT_PERMITTED);
    }
    return caller;
  }
}

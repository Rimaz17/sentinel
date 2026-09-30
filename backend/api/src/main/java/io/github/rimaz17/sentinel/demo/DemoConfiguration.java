package io.github.rimaz17.sentinel.demo;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/** The demo's settings, read whether or not the demo is on, so the rules can ask either way. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(DemoProperties.class)
class DemoConfiguration {}

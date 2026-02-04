package com.hydrangea.storage_service.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC configuration.
 * Note: CORS is handled by CorsFilter with @Order(Ordered.HIGHEST_PRECEDENCE)
 * to ensure CORS headers are added to ALL responses including error responses.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    // CORS configuration removed - handled by CorsFilter
}

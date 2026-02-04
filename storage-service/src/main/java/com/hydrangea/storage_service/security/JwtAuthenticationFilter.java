package com.hydrangea.storage_service.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.hydrangea.storage_service.util.JwtUtil;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Skip JWT filter for CORS preflight requests
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }

        // Skip JWT filter for public endpoints
        // Note: /api/files/preview/{fileId} uses token in URL, not header
        // /api/files/preview-data/{fileId} uses Authorization header, so don't skip it
        return path.startsWith("/api/auth") ||
                (path.startsWith("/api/files/preview/") && !path.contains("preview-data")) ||
                path.startsWith("/ws") ||
                path.startsWith("/actuator/health");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");
        log.debug("Processing request: {} {}", request.getMethod(), request.getRequestURI());

        String username = null;
        String jwt = null;

        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            try {
                username = jwtUtil.extractUsername(jwt);
                log.debug("Extracted username from JWT: {}", username);
            } catch (Exception e) {
                log.error("Error extracting username from JWT: {}", e.getMessage());
            }
        } else {
            log.debug("No Authorization header or not Bearer token");
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            if (jwtUtil.validateToken(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities());
                authenticationToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                log.debug("JWT authentication successful for user: {} with roles: {}", username, userDetails.getAuthorities());
            } else {
                log.warn("JWT validation failed for user: {}", username);
            }
        }

        filterChain.doFilter(request, response);
    }
}
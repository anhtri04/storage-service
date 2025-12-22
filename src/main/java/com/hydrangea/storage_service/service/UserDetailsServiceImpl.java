package com.hydrangea.storage_service.service;

import java.security.Principal;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Service;

import com.hydrangea.storage_service.Repository.UserRepository;
import com.hydrangea.storage_service.entity.User;
import com.hydrangea.storage_service.security.CustomUserDetails;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        CustomUserDetails customUserDetails = new CustomUserDetails();
        customUserDetails.setId(user.getId());
        customUserDetails.setUsername(user.getUsername());
        customUserDetails.setPassword(user.getPassword());
        customUserDetails.setRole(user.getRole());

        return customUserDetails;
    }

    public CustomUserDetails extractUser(SimpMessageHeaderAccessor headerAccessor) {
        Principal principal = headerAccessor.getUser();

        if (principal == null) {
            log.error("Authentication required but principal is null for session: {}",
                    headerAccessor.getSessionId());
            throw new IllegalStateException("Authentication required");
        }

        if (principal instanceof Authentication) {
            Authentication auth = (Authentication) principal;
            Object authPrincipal = auth.getPrincipal();

            if (authPrincipal instanceof CustomUserDetails) {
                return (CustomUserDetails) authPrincipal;
            }
        }

        log.error("Could not extract CustomUserDetails from principal type: {} for session: {}",
                principal.getClass().getName(),
                headerAccessor.getSessionId());
        throw new IllegalStateException("Invalid authentication type");
    }
}

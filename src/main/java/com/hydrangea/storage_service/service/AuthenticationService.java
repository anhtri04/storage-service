package com.hydrangea.storage_service.service;

import com.hydrangea.storage_service.dto.auth.LoginRequest;
import com.hydrangea.storage_service.dto.auth.LoginResponse;
import com.hydrangea.storage_service.dto.auth.RefreshTokenRequest;
import com.hydrangea.storage_service.dto.auth.RegisterRequest;
import com.hydrangea.storage_service.dto.auth.RegisterResponse;
import com.hydrangea.storage_service.dto.auth.UserDTO;
import com.hydrangea.storage_service.entity.User;
import com.hydrangea.storage_service.mapper.UserMapper;
import com.hydrangea.storage_service.repository.UserRepository;
import com.hydrangea.storage_service.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticationService {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final BucketService bucketService;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    public RegisterResponse register(RegisterRequest request) {
        log.info("Registering new user: {}", request.getUsername());

        try {
            if (!userRepository.existsByUsername(request.getUsername())
                    && !userRepository.existsByEmail(request.getEmail())) {
                User user = User.builder()
                        .username(request.getUsername())
                        .email(request.getEmail())
                        .passwordHash(passwordEncoder.encode(request.getPassword()))
                        .role("USER")
                        .build();
                userRepository.save(user);

                // UserDTO userDTO = userMapper.toUserDTO(user);

                // bucketService.createDefaultBucket(userDTO);

                log.info("User registered successfully: {}", request.getUsername());
                return new RegisterResponse("User registered successfully");
            } else {
                log.error("Username or email already exists: {}", request.getUsername());
                throw new IllegalArgumentException("Username or email already exists");
            }
        } catch (Exception e) {
            log.error("Error during registration: {}", e.getMessage());
            throw new RuntimeException("Error during registration", e);
        }
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()));
        } catch (BadCredentialsException e) {
            log.error("Invalid credentials for user: {}", request.getUsername());
            throw new BadCredentialsException("Invalid username or password");
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
        final String accessToken = jwtUtil.generateAccessToken(userDetails);
        final String refreshToken = jwtUtil.generateRefreshToken(userDetails);

        // Update last login time
        userRepository.findByUsername(request.getUsername()).ifPresent(user -> {
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
        });

        log.info("Login successful for user: {}", request.getUsername());

        // Access token expiration is 15 minutes (900 seconds)
        return new LoginResponse(accessToken, refreshToken, 900L);
    }

    @Transactional(readOnly = true)
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        log.info("Refresh token request received");

        String refreshToken = request.getRefreshToken();

        if (!jwtUtil.validateToken(refreshToken)) {
            log.error("Invalid or expired refresh token");
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        String username = jwtUtil.extractUsername(refreshToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

        String newAccessToken = jwtUtil.generateAccessToken(userDetails);
        String newRefreshToken = jwtUtil.generateRefreshToken(userDetails);

        log.info("Token refresh successful for user: {}", username);

        return new LoginResponse(newAccessToken, newRefreshToken, 900L);
    }

    public void logout(String username) {
        log.info("User logged out: {}", username);
        // In a stateless JWT architecture, we rely on the client to discard the token.

        // If we implemented a token blacklist (e.g., in Redis), we would add the token
        // here.
    }
}
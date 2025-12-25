package com.hydrangea.storage_service.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import com.hydrangea.storage_service.dto.response.ApiResponse;
import com.hydrangea.storage_service.dto.auth.LoginRequest;
import com.hydrangea.storage_service.dto.auth.LoginResponse;
import com.hydrangea.storage_service.dto.auth.LogoutRequest;
import com.hydrangea.storage_service.dto.auth.RefreshTokenRequest;
import com.hydrangea.storage_service.dto.auth.RegisterRequest;
import com.hydrangea.storage_service.dto.auth.RegisterResponse;
import com.hydrangea.storage_service.service.AuthenticationService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationService authenticationService;

    // Login to an existen account
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login request received for user: {}", request.getUsername());
        LoginResponse response = authenticationService.login(request);
        return ApiResponse.<LoginResponse>builder()
                .result(response)
                .build();
    }

    // Register a new account
    @PostMapping("/register")
    public ApiResponse<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration request received for user: {}", request.getUsername());

        return ApiResponse.<RegisterResponse>builder()
                .result(authenticationService.register(request))
                .build();
    }

    // Logout from an account
    @PostMapping("/logout")
    public ApiResponse<String> logout(@RequestBody LogoutRequest request) {
        log.info("Logout request received for user: {}", request.getUsername());
        authenticationService.logout(request.getUsername());

        return ApiResponse.<String>builder()
                .code(200)
                .message("Logout successful")
                .build();
    }

    // Refresh the access token
    @PostMapping("/refresh")
    public ApiResponse<LoginResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        log.info("Refresh token request received");
        LoginResponse response = authenticationService.refreshToken(request);
        return ApiResponse.<LoginResponse>builder()
                .result(response)
                .build();
    }
}

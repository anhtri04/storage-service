package com.hydrangea.storage_service.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 4, message = "Username length must be at least 4 digits")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password length must be at least 6 digits")
    @Size(max = 20, message = "Password length must be at max 20 digits")
    private String password;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

}

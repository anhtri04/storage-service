package com.hydrangea.storage_service.dto.request;

import com.hydrangea.storage_service.constant.AccessLevel;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateShareLinkRequest {
    @NotBlank(message = "Resource ID is required")
    private String resourceId;

    @NotNull(message = "Access level is required")
    private AccessLevel accessLevel;

    private String password; // Optional
}

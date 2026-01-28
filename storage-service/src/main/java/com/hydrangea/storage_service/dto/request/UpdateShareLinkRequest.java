package com.hydrangea.storage_service.dto.request;

import com.hydrangea.storage_service.constant.AccessLevel;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateShareLinkRequest {
    @NotBlank(message = "Link ID is required")
    private String linkId;

    private AccessLevel accessLevel;

    private String password; // Optional - if provided, updates or removes password
}

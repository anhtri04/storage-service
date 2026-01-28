package com.hydrangea.storage_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyShareLinkRequest {
    @NotBlank(message = "Link is required")
    private String link;

    private String password; // Required if link is password protected
}

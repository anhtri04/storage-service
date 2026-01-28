package com.hydrangea.storage_service.dto.response;

import java.time.LocalDateTime;

import com.hydrangea.storage_service.constant.AccessLevel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShareLinkResponse {
    private Long id;
    private String link;
    private String resourceId;
    private String createdByUsername;
    private AccessLevel accessLevel;
    private Boolean isPasswordProtected;
    private Boolean isActive;
    private LocalDateTime createdAt;
}

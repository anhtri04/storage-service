package com.hydrangea.storage_service.dto.response;

import com.hydrangea.storage_service.constant.AccessLevel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollaboratorResponse {
    private Long id;
    private String collaboratorUsername;
    private String collaboratorEmail;
    private AccessLevel accessLevel;
}

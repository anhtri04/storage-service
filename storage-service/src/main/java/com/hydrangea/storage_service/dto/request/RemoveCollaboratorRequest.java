package com.hydrangea.storage_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RemoveCollaboratorRequest {
    private String bucketId;
    private Long collaboratorId; // user id
}

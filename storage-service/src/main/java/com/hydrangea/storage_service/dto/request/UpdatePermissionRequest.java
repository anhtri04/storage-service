package com.hydrangea.storage_service.dto.request;

import com.hydrangea.storage_service.constant.AccessLevel;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UpdatePermissionRequest {
    private String bucketId;
    private Long collaboratorId;
    private AccessLevel accessLevel;
}

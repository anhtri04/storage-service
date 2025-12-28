package com.hydrangea.storage_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BucketUpdateRequest {
    private String name;
    private String description;
    private String bucketId;
    private Long userId;
}

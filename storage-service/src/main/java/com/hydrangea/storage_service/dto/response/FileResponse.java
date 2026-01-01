package com.hydrangea.storage_service.dto.response;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileResponse {
    private String id;
    private String name;
    private String type;
    private Long size;
    private String bucketId;
    private String bucketName;
    private LocalDateTime createdAt;
}

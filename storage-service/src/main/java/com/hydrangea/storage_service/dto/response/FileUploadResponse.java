package com.hydrangea.storage_service.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class FileUploadResponse {
    private String fileId;
    private String originalFileName;
    private Long fileSize;
    private Integer totalChunks;
    private Integer uniqueChunks;
    private Integer duplicateChunks;
    private String message;
}

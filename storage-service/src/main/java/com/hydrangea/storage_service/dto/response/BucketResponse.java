package com.hydrangea.storage_service.dto.response;

import java.util.List;

import com.hydrangea.storage_service.dto.auth.UserDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BucketResponse {
    private String bucketId;
    private String name;
    private String description;
    private UserDTO user;
    private List<FileResponse> files;
}

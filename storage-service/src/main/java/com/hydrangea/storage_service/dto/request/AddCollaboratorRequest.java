package com.hydrangea.storage_service.dto.request;

import java.util.List;

import com.hydrangea.storage_service.constant.AccessLevel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddCollaboratorRequest {
    private String bucketId;
    // change to List<String> after the refactor of the User entity(dual id). Still
    // need time to research!!!!!
    private List<Long> collaboratorId; // user id
    private AccessLevel accessLevel;
}

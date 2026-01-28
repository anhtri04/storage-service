package com.hydrangea.storage_service.controller;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hydrangea.storage_service.dto.request.AddCollaboratorRequest;
import com.hydrangea.storage_service.dto.request.RemoveCollaboratorRequest;
import com.hydrangea.storage_service.dto.request.UpdatePermissionRequest;
import com.hydrangea.storage_service.dto.response.ApiResponse;
import com.hydrangea.storage_service.dto.response.CollaboratorResponse;
import com.hydrangea.storage_service.security.CustomUserDetails;
import com.hydrangea.storage_service.service.CollabService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/collab")
@RequiredArgsConstructor
@Slf4j
public class CollabController {

    private final CollabService collabService;

    @PostMapping
    public ApiResponse<Void> addCollaborators(@RequestBody AddCollaboratorRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Adding collaborators to bucket {} for user {}", request.getBucketId(), userDetails.getUsername());
        try {
            collabService.addCollaborators(request, userDetails.getId());
            return ApiResponse.<Void>builder()
                    .code(200)
                    .message("Collaborators added successfully")
                    .build();
        } catch (Exception e) {
            log.error("Failed to add collaborators: {}", e.getMessage());
            return ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to add collaborators: " + e.getMessage())
                    .build();
        }
    }

    @DeleteMapping
    public ApiResponse<Void> removeCollaborator(@RequestBody RemoveCollaboratorRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Removing collaborator {} from bucket {} for user {}", request.getCollaboratorId(),
                request.getBucketId(), userDetails.getUsername());
        try {
            collabService.removeCollaborator(request, userDetails.getId());
            return ApiResponse.<Void>builder()
                    .code(200)
                    .message("Collaborator removed successfully")
                    .build();
        } catch (Exception e) {
            log.error("Failed to remove collaborator: {}", e.getMessage());
            return ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to remove collaborator: " + e.getMessage())
                    .build();
        }
    }

    @PutMapping
    public ApiResponse<Void> updatePermission(@RequestBody UpdatePermissionRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Updating permission for collaborator {} on bucket {} for user {}", request.getCollaboratorId(),
                request.getBucketId(), userDetails.getUsername());
        try {
            collabService.updatePermission(request, userDetails.getId());
            return ApiResponse.<Void>builder()
                    .code(200)
                    .message("Permission updated successfully")
                    .build();
        } catch (Exception e) {
            log.error("Failed to update permission: {}", e.getMessage());
            return ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to update permission: " + e.getMessage())
                    .build();
        }
    }

    @GetMapping("/{bucketId}")
    public ApiResponse<List<CollaboratorResponse>> getCollaborators(@PathVariable String bucketId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Getting collaborators for bucket {} for user {}", bucketId, userDetails.getUsername());
        try {
            List<CollaboratorResponse> collaborators = collabService.getCollaborators(bucketId, userDetails.getId());
            return ApiResponse.<List<CollaboratorResponse>>builder()
                    .code(200)
                    .message("Collaborators retrieved successfully")
                    .result(collaborators)
                    .build();
        } catch (Exception e) {
            log.error("Failed to get collaborators: {}", e.getMessage());
            return ApiResponse.<List<CollaboratorResponse>>builder()
                    .code(500)
                    .message("Failed to get collaborators: " + e.getMessage())
                    .build();
        }
    }
}

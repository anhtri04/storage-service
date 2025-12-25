package com.hydrangea.storage_service.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hydrangea.storage_service.dto.auth.UserDTO;
import com.hydrangea.storage_service.dto.request.BucketCreationRequest;
import com.hydrangea.storage_service.dto.request.BucketUpdateRequest;
import com.hydrangea.storage_service.dto.response.ApiResponse;
import com.hydrangea.storage_service.dto.response.BucketResponse;
import com.hydrangea.storage_service.dto.response.FileResponse;
import com.hydrangea.storage_service.entity.FileMetadata;
import com.hydrangea.storage_service.mapper.UserMapper;
import com.hydrangea.storage_service.security.CustomUserDetails;
import com.hydrangea.storage_service.service.BucketService;
import com.hydrangea.storage_service.service.FileStorageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/buckets")
@RequiredArgsConstructor
@Slf4j
public class BucketController {
        private final BucketService bucketService;
        private final UserMapper userMapper;
        private final FileStorageService fileStorageService;

        // Create a new bucket
        @PostMapping
        public ApiResponse<BucketResponse> createBucket(@RequestBody BucketCreationRequest request,
                        @AuthenticationPrincipal CustomUserDetails userDetails) {
                log.info("Creating bucket for user: " + userDetails.getUsername());
                try {
                        BucketResponse data = bucketService.createBucket(request, userMapper.toUserDTO(userDetails));
                        return ApiResponse.<BucketResponse>builder()
                                        .code(200)
                                        .message("Bucket created successfully")
                                        .result(data)
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to create bucket: " + e.getMessage());
                        return ApiResponse.<BucketResponse>builder()
                                        .code(500)
                                        .message("Failed to create bucket")
                                        .build();
                }
        }

        // Get all buckets of a user
        @GetMapping
        public ApiResponse<List<BucketResponse>> listUserBuckets(
                        @AuthenticationPrincipal CustomUserDetails userDetails) {
                log.info("Listing buckets for user: " + userDetails.getUsername());
                try {
                        UserDTO user = userMapper.toUserDTO(userDetails);
                        List<BucketResponse> data = bucketService.listUserBuckets(user);
                        return ApiResponse.<List<BucketResponse>>builder()
                                        .code(200)
                                        .message("Buckets retrieved successfully")
                                        .result(data)
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to retrieve buckets: " + e.getMessage());
                        return ApiResponse.<List<BucketResponse>>builder()
                                        .code(500)
                                        .message("Failed to retrieve buckets")
                                        .build();
                }
        }

        // Get a bucket details and files containing in it by id
        @GetMapping("/{bucketId}")
        public ApiResponse<BucketResponse> getBucketById(@PathVariable Long bucketId,
                        @AuthenticationPrincipal CustomUserDetails userDetails) {
                log.info("Getting bucket details for user: " + userDetails.getUsername());
                try {
                        List<FileResponse> files = fileStorageService.listFiles(bucketId, userDetails.getId())
                                        .stream()
                                        .<FileResponse>map(file -> FileResponse.builder()
                                                        .id(file.getFileId())
                                                        .name(file.getOriginalFileName())
                                                        .type(file.getContentType())
                                                        .size(file.getFileSize())
                                                        .bucketId(file.getBucket().getBucketId())
                                                        .bucketName(file.getBucket().getName())
                                                        .createdAt(file.getUploadedAt())
                                                        .build())
                                        .collect(Collectors.toList());
                        BucketResponse bucketData = bucketService.getBucketById(bucketId, userDetails.getId());
                        bucketData.setFiles(files);

                        return ApiResponse.<BucketResponse>builder()
                                        .code(200)
                                        .message("Bucket retrieved successfully")
                                        .result(bucketData)
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to retrieve bucket: " + e.getMessage());
                        return ApiResponse.<BucketResponse>builder()
                                        .code(500)
                                        .message("Failed to retrieve bucket")
                                        .build();
                }
        }

        // Delete a bucket by id
        @DeleteMapping("/{bucketId}")
        public ApiResponse<Void> deleteBucket(@PathVariable Long bucketId,
                        @AuthenticationPrincipal CustomUserDetails userDetails) {
                log.info("Deleting bucket for user: " + userDetails.getUsername());
                try {
                        bucketService.deleteBucket(bucketId, userDetails.getId());
                        return ApiResponse.<Void>builder()
                                        .code(200)
                                        .message("Bucket deleted successfully")
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to delete bucket: " + e.getMessage());
                        return ApiResponse.<Void>builder()
                                        .code(500)
                                        .message("Failed to delete bucket")
                                        .build();
                }
        }

        // Update a bucket by id
        @PutMapping("/{bucketId}")
        public ApiResponse<BucketResponse> updateBucket(@PathVariable Long bucketId,
                        @RequestBody BucketUpdateRequest request,
                        @AuthenticationPrincipal CustomUserDetails userDetails) {
                log.info("Updating bucket for user: " + userDetails.getUsername());
                try {
                        request.setBucketId(bucketId);
                        request.setUserId(userDetails.getId());

                        BucketResponse data = bucketService.updateBucket(request);
                        return ApiResponse.<BucketResponse>builder()
                                        .code(200)
                                        .message("Bucket updated successfully")
                                        .result(data)
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to update bucket: " + e.getMessage());
                        return ApiResponse.<BucketResponse>builder()
                                        .code(500)
                                        .message("Failed to update bucket")
                                        .build();
                }
        }
}

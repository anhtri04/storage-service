package com.hydrangea.storage_service.controller;

import com.hydrangea.storage_service.dto.response.ApiResponse;
import com.hydrangea.storage_service.dto.response.FileUploadResponse;
import com.hydrangea.storage_service.entity.FileMetadata;
import com.hydrangea.storage_service.security.CustomUserDetails;
import com.hydrangea.storage_service.service.FileStorageService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/files")
@Slf4j
public class FileStorageController {

    private final FileStorageService fileStorageService;

    public FileStorageController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    // Upload a file
    @PostMapping("/upload")
    public ApiResponse<FileUploadResponse> uploadFile(@RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(value = "bucketId", required = false) Long bucketId) {
        log.info("Uploading file for user: " + userDetails.getUsername());
        try {
            if (file.isEmpty()) {
                return ApiResponse.<FileUploadResponse>builder()
                        .code(400)
                        .message("File is empty")
                        .build();
            }

            FileUploadResponse response = fileStorageService.uploadFile(file, userDetails.getId(), bucketId);
            return ApiResponse.<FileUploadResponse>builder()
                    .code(200)
                    .message("File uploaded successfully")
                    .result(response)
                    .build();
        } catch (IOException e) {
            log.error("Failed to upload file: " + e.getMessage());
            return ApiResponse.<FileUploadResponse>builder()
                    .code(500)
                    .message("Failed to upload file: " + e.getMessage())
                    .build();
        }
    }

    // Download a file
    @GetMapping("/download/{fileId}")
    public ResponseEntity<byte[]> downloadFile(
            @PathVariable String fileId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("Downloading file for user: " + userDetails.getUsername());

        try {
            FileMetadata metadata = fileStorageService.getFileMetadata(fileId, userDetails.getId());
            byte[] fileData = fileStorageService.downloadFile(fileId, userDetails.getId());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(metadata.getContentType()));
            headers.setContentDisposition(
                    ContentDisposition.builder("attachment")
                            .filename(metadata.getOriginalFileName())
                            .build());
            headers.setContentLength(fileData.length);

            log.info("File downloaded successfully: " + metadata.getOriginalFileName() +
                    ", size: " + fileData.length);

            return new ResponseEntity<>(fileData, headers, HttpStatus.OK);

        } catch (Exception e) {
            log.error("Failed to download file: " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // Delete a file
    @DeleteMapping("/{fileId}")
    public ApiResponse<Map<String, String>> deleteFile(@PathVariable String fileId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Deleting file for user: " + userDetails.getUsername());
        try {
            fileStorageService.deleteFile(fileId, userDetails.getId());
            return ApiResponse.<Map<String, String>>builder()
                    .code(200)
                    .message("File deleted successfully")
                    .result(Map.of("message", "File deleted successfully"))
                    .build();
        } catch (Exception e) {
            log.error("Failed to delete file: " + e.getMessage());
            return ApiResponse.<Map<String, String>>builder()
                    .code(500)
                    .message("Failed to delete file: " + e.getMessage())
                    .build();
        }
    }

    // Get file metadata
    @GetMapping("/{fileId}/metadata")
    public ApiResponse<Map<String, Object>> getFileMetadata(@PathVariable String fileId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Getting file metadata for user: " + userDetails.getUsername());
        try {
            FileMetadata metadata = fileStorageService.getFileMetadata(fileId, userDetails.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("fileId", metadata.getFileId());
            response.put("originalFileName", metadata.getOriginalFileName());
            response.put("fileSize", metadata.getFileSize());
            response.put("contentType", metadata.getContentType());
            response.put("uploadedAt", metadata.getUploadedAt().toString());
            response.put("totalChunks", metadata.getChunkMappings().size());

            return ApiResponse.<Map<String, Object>>builder()
                    .code(200)
                    .message("File metadata retrieved successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Failed to get file metadata: " + e.getMessage());
            return ApiResponse.<Map<String, Object>>builder()
                    .code(404)
                    .message("File not found")
                    .build();
        }
    }
}
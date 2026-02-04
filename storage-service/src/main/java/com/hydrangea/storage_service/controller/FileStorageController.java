package com.hydrangea.storage_service.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.hydrangea.storage_service.dto.request.BulkDownloadRequest;
import com.hydrangea.storage_service.dto.response.ApiResponse;
import com.hydrangea.storage_service.dto.response.FileUploadResponse;
import com.hydrangea.storage_service.entity.FileMetadata;
import com.hydrangea.storage_service.security.CustomUserDetails;
import com.hydrangea.storage_service.service.FileStorageService;

import lombok.extern.slf4j.Slf4j;

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
            @RequestParam(value = "bucketId", required = false) String bucketId) {
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
            // Use inline for PDFs to allow preview, attachment for other files
            String dispositionType = metadata.getContentType().equals("application/pdf") ? "inline" : "attachment";
            headers.setContentDisposition(
                    ContentDisposition.builder(dispositionType)
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

    // Download multiple files as ZIP
    @PostMapping("/download-zip")
    public ResponseEntity<byte[]> downloadFilesAsZip(@RequestBody BulkDownloadRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Downloading {} files as ZIP for user: {}", request.getFileIds().size(), userDetails.getUsername());

        try {
            List<String> fileIds = request.getFileIds();
            if (fileIds == null || fileIds.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            byte[] zipData = fileStorageService.downloadFilesAsZip(fileIds, userDetails.getId());

            // Generate filename with date
            String date = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
            String zipFilename = "files-" + date + ".zip";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/zip"));
            headers.setContentDisposition(
                    ContentDisposition.builder("attachment")
                            .filename(zipFilename)
                            .build());
            headers.setContentLength(zipData.length);

            log.info("ZIP downloaded successfully: {} bytes", zipData.length);

            return new ResponseEntity<>(zipData, headers, HttpStatus.OK);

        } catch (Exception e) {
            log.error("Failed to create ZIP: " + e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Preview a file using token-based authentication (token in URL query param).
     * This endpoint is designed for iframe embedding and avoids browser extension interference.
     * The token is passed as a query parameter instead of Authorization header.
     */
    @GetMapping("/preview/{fileId}")
    public ResponseEntity<byte[]> previewFile(
            @PathVariable String fileId,
            @RequestParam("token") String token) {

        log.info("Preview file request for fileId: {}", fileId);

        try {
            // Validate token and get user details
            if (token == null || token.isEmpty()) {
                log.warn("Preview request with empty token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            byte[] fileData = fileStorageService.downloadFileWithToken(fileId, token);
            FileMetadata metadata = fileStorageService.getFileMetadataWithToken(fileId, token);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(metadata.getContentType()));
            // Always use inline for preview
            headers.setContentDisposition(
                    ContentDisposition.builder("inline")
                            .filename(metadata.getOriginalFileName())
                            .build());
            headers.setContentLength(fileData.length);
            // Allow iframe embedding
            headers.set("X-Frame-Options", "SAMEORIGIN");

            log.info("File preview successful: {}, size: {}", metadata.getOriginalFileName(), fileData.length);

            return new ResponseEntity<>(fileData, headers, HttpStatus.OK);

        } catch (Exception e) {
            log.error("Failed to preview file: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    /**
     * Get file content as base64 for preview in browser.
     * Returns JSON with base64 data and content type.
     * This approach bypasses download managers like IDM.
     */
    @GetMapping("/preview-data/{fileId}")
    public ApiResponse<Map<String, String>> getFilePreviewData(
            @PathVariable String fileId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("Getting preview data for file: {} for user: {}", fileId, userDetails.getUsername());

        try {
            FileMetadata metadata = fileStorageService.getFileMetadata(fileId, userDetails.getId());
            byte[] fileData = fileStorageService.downloadFile(fileId, userDetails.getId());

            String base64Data = Base64.getEncoder().encodeToString(fileData);

            Map<String, String> result = new HashMap<>();
            result.put("data", base64Data);
            result.put("contentType", metadata.getContentType());
            result.put("fileName", metadata.getOriginalFileName());

            log.info("Preview data generated for: {}, size: {} bytes", metadata.getOriginalFileName(), fileData.length);

            return ApiResponse.<Map<String, String>>builder()
                    .code(200)
                    .message("Preview data retrieved successfully")
                    .result(result)
                    .build();

        } catch (Exception e) {
            log.error("Failed to get preview data: {}", e.getMessage());
            return ApiResponse.<Map<String, String>>builder()
                    .code(404)
                    .message("File not found")
                    .build();
        }
    }
}
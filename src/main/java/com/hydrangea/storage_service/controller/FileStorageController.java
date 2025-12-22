package com.hydrangea.storage_service.controller;

import com.hydrangea.storage_service.service.S3Service;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileStorageController {

    private final S3Service s3Service;

    public FileStorageController(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    /**
     * Upload a file
     * POST /api/files/upload
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "File is empty"));
            }

            String fileName = s3Service.uploadFile(file);

            Map<String, String> response = new HashMap<>();
            response.put("fileName", fileName);
            response.put("message", "File uploaded successfully");

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload file: " + e.getMessage()));
        }
    }

    /**
     * Download a file
     * GET /api/files/download/{fileName}
     */
    @GetMapping("/download/{fileName}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String fileName) {
        try {
            byte[] fileData = s3Service.downloadFile(fileName);
            HeadObjectResponse metadata = s3Service.getFileMetadata(fileName);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(metadata.contentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fileName + "\"")
                    .body(fileData);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete a file
     * DELETE /api/files/{fileName}
     */
    @DeleteMapping("/{fileName}")
    public ResponseEntity<Map<String, String>> deleteFile(@PathVariable String fileName) {
        try {
            s3Service.deleteFile(fileName);
            return ResponseEntity.ok(Map.of("message", "File deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete file: " + e.getMessage()));
        }
    }

    /**
     * List all files
     * GET /api/files
     */
    @GetMapping
    public ResponseEntity<List<String>> listFiles() {
        try {
            List<String> files = s3Service.listFiles();
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get file metadata
     * GET /api/files/{fileName}/metadata
     */
    @GetMapping("/{fileName}/metadata")
    public ResponseEntity<Map<String, Object>> getFileMetadata(@PathVariable String fileName) {
        try {
            HeadObjectResponse metadata = s3Service.getFileMetadata(fileName);

            Map<String, Object> response = new HashMap<>();
            response.put("fileName", fileName);
            response.put("contentType", metadata.contentType());
            response.put("contentLength", metadata.contentLength());
            response.put("lastModified", metadata.lastModified().toString());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
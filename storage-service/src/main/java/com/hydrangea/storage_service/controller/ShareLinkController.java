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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.hydrangea.storage_service.dto.request.CreateShareLinkRequest;
import com.hydrangea.storage_service.dto.request.UpdateShareLinkRequest;
import com.hydrangea.storage_service.dto.request.VerifyShareLinkRequest;
import com.hydrangea.storage_service.dto.response.ApiResponse;
import com.hydrangea.storage_service.dto.response.ShareLinkResponse;
import com.hydrangea.storage_service.security.CustomUserDetails;
import com.hydrangea.storage_service.service.ShareLinkService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/share-links")
@RequiredArgsConstructor
@Slf4j
public class ShareLinkController {

    private final ShareLinkService shareLinkService;

    @PostMapping
    public ApiResponse<ShareLinkResponse> createShareLink(@RequestBody CreateShareLinkRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Creating share link for resource {} by user {}", request.getResourceId(),
                userDetails.getUsername());
        try {
            ShareLinkResponse response = shareLinkService.createShareLink(request, userDetails.getId());
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(200)
                    .message("Share link created successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Failed to create share link: {}", e.getMessage());
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(500)
                    .message("Failed to create share link: " + e.getMessage())
                    .build();
        }
    }

    @PutMapping("/{linkId}")
    public ApiResponse<ShareLinkResponse> updateShareLink(@PathVariable String linkId,
            @RequestBody UpdateShareLinkRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Updating share link {} by user {}", linkId, userDetails.getUsername());
        try {
            ShareLinkResponse response = shareLinkService.updateShareLink(linkId, request, userDetails.getId());
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(200)
                    .message("Share link updated successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Failed to update share link: {}", e.getMessage());
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(500)
                    .message("Failed to update share link: " + e.getMessage())
                    .build();
        }
    }

    @DeleteMapping("/{linkId}")
    public ApiResponse<Void> deleteShareLink(@PathVariable String linkId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Deleting share link {} by user {}", linkId, userDetails.getUsername());
        try {
            shareLinkService.deleteShareLink(linkId, userDetails.getId());
            return ApiResponse.<Void>builder()
                    .code(200)
                    .message("Share link deleted successfully")
                    .build();
        } catch (Exception e) {
            log.error("Failed to delete share link: {}", e.getMessage());
            return ApiResponse.<Void>builder()
                    .code(500)
                    .message("Failed to delete share link: " + e.getMessage())
                    .build();
        }
    }

    @PostMapping("/{linkId}/deactivate")
    public ApiResponse<ShareLinkResponse> deactivateShareLink(@PathVariable String linkId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Deactivating share link {} by user {}", linkId, userDetails.getUsername());
        try {
            ShareLinkResponse response = shareLinkService.deactivateShareLink(linkId, userDetails.getId());
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(200)
                    .message("Share link deactivated successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Failed to deactivate share link: {}", e.getMessage());
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(500)
                    .message("Failed to deactivate share link: " + e.getMessage())
                    .build();
        }
    }

    @GetMapping("/my")
    public ApiResponse<List<ShareLinkResponse>> getMyShareLinks(
            @RequestParam(required = false) Boolean activeOnly,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Getting share links for user {}", userDetails.getUsername());
        try {
            List<ShareLinkResponse> response = shareLinkService.getMyShareLinks(userDetails.getId(), activeOnly);
            return ApiResponse.<List<ShareLinkResponse>>builder()
                    .code(200)
                    .message("Share links retrieved successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Failed to get share links: {}", e.getMessage());
            return ApiResponse.<List<ShareLinkResponse>>builder()
                    .code(500)
                    .message("Failed to get share links: " + e.getMessage())
                    .build();
        }
    }

    @GetMapping("/resource/{resourceId}")
    public ApiResponse<ShareLinkResponse> getShareLinkByResourceId(@PathVariable String resourceId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        log.info("Getting share link for resource {} by user {}", resourceId, userDetails.getUsername());
        try {
            ShareLinkResponse response = shareLinkService.getShareLinkByResourceId(resourceId,
                    userDetails.getId());
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(200)
                    .message("Share link retrieved successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Failed to get share link: {}", e.getMessage());
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(500)
                    .message("Failed to get share link: " + e.getMessage())
                    .build();
        }
    }

    @PostMapping("/verify")
    public ApiResponse<ShareLinkResponse> verifyShareLink(@RequestBody VerifyShareLinkRequest request) {
        log.info("Verifying share link {}", request.getLink());
        try {
            ShareLinkResponse response = shareLinkService.verifyAndAccessShareLink(request);
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(200)
                    .message("Share link verified successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Failed to verify share link: {}", e.getMessage());
            return ApiResponse.<ShareLinkResponse>builder()
                    .code(500)
                    .message("Failed to verify share link: " + e.getMessage())
                    .build();
        }
    }
}

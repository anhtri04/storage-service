package com.hydrangea.storage_service.service;

import java.util.List;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hydrangea.storage_service.dto.request.CreateShareLinkRequest;
import com.hydrangea.storage_service.dto.request.UpdateShareLinkRequest;
import com.hydrangea.storage_service.dto.request.VerifyShareLinkRequest;
import com.hydrangea.storage_service.dto.response.ShareLinkResponse;
import com.hydrangea.storage_service.entity.Bucket;
import com.hydrangea.storage_service.entity.ShareLink;
import com.hydrangea.storage_service.entity.User;
import com.hydrangea.storage_service.exception.AppException;
import com.hydrangea.storage_service.exception.ErrorCode;
import com.hydrangea.storage_service.repository.BucketRepository;
import com.hydrangea.storage_service.repository.FileMetadataRepository;
import com.hydrangea.storage_service.repository.ShareLinkRepository;
import com.hydrangea.storage_service.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShareLinkService {

    private final ShareLinkRepository shareLinkRepository;
    private final BucketRepository bucketRepository;
    private final FileMetadataRepository fileMetadataRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public ShareLinkResponse createShareLink(CreateShareLinkRequest request, Long userId) {
        // Verify user owns the resource
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Check if resourceId is a bucket or file
        boolean isBucket = bucketRepository.findByBucketId(request.getResourceId()).isPresent();
        boolean isFile = fileMetadataRepository.findByFileId(request.getResourceId()).isPresent();

        if (!isBucket && !isFile) {
            throw new AppException(ErrorCode.INVALID_SHARE_LINK);
        }

        // If it's a bucket, verify ownership
        if (isBucket) {
            Bucket bucket = bucketRepository.findByBucketId(request.getResourceId())
                    .orElseThrow(() -> new AppException(ErrorCode.INVALID_SHARE_LINK));
            if (!bucket.getUser().getId().equals(userId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }
        }

        // Generate unique link
        String link;
        do {
            link = generateUniqueLink();
        } while (shareLinkRepository.existsByLink(link));

        // Hash password if provided
        String hashedPassword = null;
        boolean isPasswordProtected = false;
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            hashedPassword = passwordEncoder.encode(request.getPassword());
            isPasswordProtected = true;
        }

        ShareLink shareLink = ShareLink.builder()
                .link(link)
                .resourceId(request.getResourceId())
                .createdBy(user)
                .accessLevel(request.getAccessLevel())
                .isPasswordProtected(isPasswordProtected)
                .hashPassword(hashedPassword)
                .isActive(true)
                .build();

        shareLinkRepository.save(shareLink);
        log.info("Created share link {} for resource {} by user {}", link, request.getResourceId(), userId);

        return toResponse(shareLink);
    }

    @Transactional
    public ShareLinkResponse updateShareLink(String linkId, UpdateShareLinkRequest request, Long userId) {
        ShareLink shareLink = shareLinkRepository.findByLink(linkId)
                .orElseThrow(() -> new AppException(ErrorCode.SHARE_LINK_NOT_FOUND));

        // Verify ownership
        if (!shareLink.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        // Update access level if provided
        if (request.getAccessLevel() != null) {
            shareLink.setAccessLevel(request.getAccessLevel());
        }

        // Update or remove password
        if (request.getPassword() != null) {
            if (request.getPassword().isEmpty()) {
                // Remove password
                shareLink.setIsPasswordProtected(false);
                shareLink.setHashPassword(null);
            } else {
                // Update password
                shareLink.setIsPasswordProtected(true);
                shareLink.setHashPassword(passwordEncoder.encode(request.getPassword()));
            }
        }

        shareLinkRepository.save(shareLink);
        log.info("Updated share link {} by user {}", linkId, userId);

        return toResponse(shareLink);
    }

    @Transactional
    public void deleteShareLink(String linkId, Long userId) {
        ShareLink shareLink = shareLinkRepository.findByLink(linkId)
                .orElseThrow(() -> new AppException(ErrorCode.SHARE_LINK_NOT_FOUND));

        // Verify ownership
        if (!shareLink.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        shareLinkRepository.delete(shareLink);
        log.info("Deleted share link {} by user {}", linkId, userId);
    }

    @Transactional
    public ShareLinkResponse deactivateShareLink(String linkId, Long userId) {
        ShareLink shareLink = shareLinkRepository.findByLink(linkId)
                .orElseThrow(() -> new AppException(ErrorCode.SHARE_LINK_NOT_FOUND));

        // Verify ownership
        if (!shareLink.getCreatedBy().getId().equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        shareLink.setIsActive(false);
        shareLinkRepository.save(shareLink);
        log.info("Deactivated share link {} by user {}", linkId, userId);

        return toResponse(shareLink);
    }

    public List<ShareLinkResponse> getMyShareLinks(Long userId, Boolean activeOnly) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<ShareLink> links;
        if (activeOnly != null && activeOnly) {
            links = shareLinkRepository.findByCreatedByAndIsActive(user, true);
        } else {
            links = shareLinkRepository.findAll().stream()
                    .filter(l -> l.getCreatedBy().getId().equals(userId))
                    .toList();
        }

        return links.stream()
                .map(this::toResponse)
                .toList();
    }

    public ShareLinkResponse verifyAndAccessShareLink(VerifyShareLinkRequest request) {
        ShareLink shareLink = shareLinkRepository.findByLink(request.getLink())
                .orElseThrow(() -> new AppException(ErrorCode.SHARE_LINK_NOT_FOUND));

        // Check if link is active
        if (!shareLink.getIsActive()) {
            throw new AppException(ErrorCode.INVALID_SHARE_LINK);
        }

        // Check password if protected
        if (shareLink.getIsPasswordProtected()) {
            if (request.getPassword() == null || request.getPassword().isEmpty()) {
                throw new AppException(ErrorCode.SHARE_LINK_PASSWORD_INVALID);
            }
            if (!passwordEncoder.matches(request.getPassword(), shareLink.getHashPassword())) {
                throw new AppException(ErrorCode.SHARE_LINK_PASSWORD_INVALID);
            }
        } else if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            // Password provided but link is not protected
            throw new AppException(ErrorCode.SHARE_LINK_PASSWORD_INVALID);
        }

        return toResponse(shareLink);
    }

    public ShareLinkResponse getShareLinkByResourceId(String resourceId, Long userId) {
        // Verify user owns the resource
        boolean isBucketOwner = bucketRepository.findByBucketId(resourceId)
                .map(b -> b.getUser().getId().equals(userId))
                .orElse(false);

        boolean isFileOwner = fileMetadataRepository.findByFileId(resourceId)
                .map(f -> f.getBucket().getUser().getId().equals(userId))
                .orElse(false);

        if (!isBucketOwner && !isFileOwner) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        List<ShareLink> links = shareLinkRepository.findByResourceIdAndIsActive(resourceId, true);
        if (links.isEmpty()) {
            throw new AppException(ErrorCode.SHARE_LINK_NOT_FOUND);
        }

        return toResponse(links.get(0)); // Return first active link
    }

    private String generateUniqueLink() {
        return UUID.randomUUID().toString().substring(0, 8) + "-" +
                UUID.randomUUID().toString().substring(0, 8);
    }

    private ShareLinkResponse toResponse(ShareLink shareLink) {
        return ShareLinkResponse.builder()
                .id(shareLink.getId())
                .link(shareLink.getLink())
                .resourceId(shareLink.getResourceId())
                .createdByUsername(shareLink.getCreatedBy().getUsername())
                .accessLevel(shareLink.getAccessLevel())
                .isPasswordProtected(shareLink.getIsPasswordProtected())
                .isActive(shareLink.getIsActive())
                .createdAt(shareLink.getCreatedAt())
                .build();
    }
}

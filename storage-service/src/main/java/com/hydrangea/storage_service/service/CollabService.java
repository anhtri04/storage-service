package com.hydrangea.storage_service.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hydrangea.storage_service.dto.request.AddCollaboratorRequest;
import com.hydrangea.storage_service.dto.request.RemoveCollaboratorRequest;
import com.hydrangea.storage_service.dto.request.UpdatePermissionRequest;
import com.hydrangea.storage_service.dto.response.CollaboratorResponse;
import com.hydrangea.storage_service.entity.Bucket;
import com.hydrangea.storage_service.entity.Collaborator;
import com.hydrangea.storage_service.entity.User;
import com.hydrangea.storage_service.exception.AppException;
import com.hydrangea.storage_service.exception.ErrorCode;
import com.hydrangea.storage_service.repository.BucketRepository;
import com.hydrangea.storage_service.repository.CollaboratorRepository;
import com.hydrangea.storage_service.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class CollabService {

    private final CollaboratorRepository collaboratorRepository;
    private final BucketRepository bucketRepository;
    private final UserRepository userRepository;

    @Transactional
    public void addCollaborators(AddCollaboratorRequest request, Long ownerId) {
        Bucket bucket = bucketRepository.findByBucketId(request.getBucketId())
                .orElseThrow(() -> new AppException(ErrorCode.BUCKET_NOT_FOUND));

        // Verify the owner is the bucket owner
        if (!bucket.getUser().getId().equals(ownerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        for (Long collaboratorId : request.getCollaboratorId()) {
            // Can't add yourself as a collaborator
            if (collaboratorId.equals(ownerId)) {
                log.warn("User {} attempted to add themselves as collaborator to bucket {}",
                        ownerId, request.getBucketId());
                continue;
            }

            User user = userRepository.findById(collaboratorId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            // Check if collaborator already exists
            if (collaboratorRepository.existsByBucketAndCollaborator(bucket, user)) {
                log.warn("User {} is already a collaborator on bucket {}", collaboratorId, request.getBucketId());
                continue;
            }

            Collaborator collaborator = Collaborator.builder()
                    .bucket(bucket)
                    .collaborator(user)
                    .owner(bucket.getUser())
                    .accessLevel(request.getAccessLevel())
                    .build();
            collaboratorRepository.save(collaborator);
            log.info("Added user {} as collaborator to bucket {} with access level {}",
                    collaboratorId, request.getBucketId(), request.getAccessLevel());
        }
    }

    @Transactional
    public void removeCollaborator(RemoveCollaboratorRequest request, Long ownerId) {
        Bucket bucket = bucketRepository.findByBucketId(request.getBucketId())
                .orElseThrow(() -> new AppException(ErrorCode.BUCKET_NOT_FOUND));

        // Verify the owner is the bucket owner
        if (!bucket.getUser().getId().equals(ownerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        User collaborator = userRepository.findById(request.getCollaboratorId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        collaboratorRepository.deleteByBucketAndCollaborator(bucket, collaborator);
        log.info("Removed user {} as collaborator from bucket {}", request.getCollaboratorId(), request.getBucketId());
    }

    @Transactional
    public void updatePermission(UpdatePermissionRequest request, Long ownerId) {
        Bucket bucket = bucketRepository.findByBucketId(request.getBucketId())
                .orElseThrow(() -> new AppException(ErrorCode.BUCKET_NOT_FOUND));

        // Verify the owner is the bucket owner
        if (!bucket.getUser().getId().equals(ownerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        User collaborator = userRepository.findById(request.getCollaboratorId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Collaborator collabRecord = collaboratorRepository.findByBucketAndCollaborator(bucket, collaborator)
                .orElseThrow(() -> new AppException(ErrorCode.COLLABORATOR_NOT_FOUND));

        collabRecord.setAccessLevel(request.getAccessLevel());
        collaboratorRepository.save(collabRecord);
        log.info("Updated permission for user {} on bucket {} to {}", request.getCollaboratorId(),
                request.getBucketId(), request.getAccessLevel());
    }

    public List<CollaboratorResponse> getCollaborators(String bucketId, Long userId) {
        Bucket bucket = bucketRepository.findByBucketId(bucketId)
                .orElseThrow(() -> new AppException(ErrorCode.BUCKET_NOT_FOUND));

        // Allow bucket owner or any collaborator to view collaborators
        if (!bucket.getUser().getId().equals(userId)
                && !collaboratorRepository.existsByBucketAndCollaborator(
                        bucket, userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        return collaboratorRepository.findAll().stream()
                .filter(c -> c.getBucket().getId().equals(bucket.getId()))
                .map(c -> CollaboratorResponse.builder()
                        .id(c.getId())
                        .collaboratorUsername(c.getCollaborator().getUsername())
                        .collaboratorEmail(c.getCollaborator().getEmail())
                        .accessLevel(c.getAccessLevel())
                        .build())
                .collect(Collectors.toList());
    }
}

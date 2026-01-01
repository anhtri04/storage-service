package com.hydrangea.storage_service.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hydrangea.storage_service.dto.auth.UserDTO;
import com.hydrangea.storage_service.dto.request.BucketCreationRequest;
import com.hydrangea.storage_service.dto.request.BucketUpdateRequest;
import com.hydrangea.storage_service.dto.response.BucketResponse;
import com.hydrangea.storage_service.entity.Bucket;
import com.hydrangea.storage_service.entity.FileMetadata;
import com.hydrangea.storage_service.entity.User;
import com.hydrangea.storage_service.mapper.UserMapper;
import com.hydrangea.storage_service.repository.BucketRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BucketService {

        private final BucketRepository bucketRepository;
        private final FileStorageService fileStorageService;
        private final UserMapper userMapper;

        // Create a new bucket
        public BucketResponse createBucket(BucketCreationRequest request, UserDTO user) {
                log.info("Creating bucket for user: " + user.getUsername());
                try {

                        User userData = userMapper.toUser(user);
                        log.info("User data: " + userData);

                        Bucket bucket = Bucket.builder()
                                        .name(request.getName())
                                        .bucketId(UUID.randomUUID().toString())
                                        .description(request.getDescription())
                                        .user(userData)
                                        .build();

                        bucketRepository.save(bucket);

                        return BucketResponse.builder()
                                        .bucketId(bucket.getBucketId())
                                        .name(bucket.getName())
                                        .description(bucket.getDescription())
                                        .user(user)
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to create bucket: " + e.getMessage());
                        throw new RuntimeException("Failed to create bucket");
                }
        }

        // Get all buckets for the current login user
        public List<BucketResponse> listUserBuckets(UserDTO user) {
                log.info("Listing buckets for user: " + user.getUsername());
                try {
                        List<Bucket> buckets = bucketRepository.findByUserId(user.getId());
                        return buckets.stream()
                                        .map(bucket -> BucketResponse.builder()
                                                        .bucketId(bucket.getBucketId())
                                                        .name(bucket.getName())
                                                        .description(bucket.getDescription())
                                                        .user(user)
                                                        .build())
                                        .collect(Collectors.toList());
                } catch (Exception e) {
                        log.error("Failed to list buckets: " + e.getMessage());
                        throw new RuntimeException("Failed to list buckets");
                }
        }

        // Get a bucket by ID
        public BucketResponse getBucketById(String bucketId, Long userId) {
                log.info("Getting bucket by ID: " + bucketId);
                try {
                        Bucket bucket = bucketRepository.findByBucketIdAndUserId(bucketId, userId)
                                        .orElseThrow(() -> new RuntimeException("Bucket not found"));
                        return BucketResponse.builder()
                                        .bucketId(bucket.getBucketId())
                                        .name(bucket.getName())
                                        .description(bucket.getDescription())
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to get bucket by ID: " + e.getMessage());
                        throw new RuntimeException("Failed to get bucket by ID");
                }
        }

        // Delete a bucket by ID
        @Transactional
        public void deleteBucket(String bucketId, Long userId) {
                log.info("Deleting bucket by ID: " + bucketId);
                try {
                        Bucket bucket = bucketRepository.findByBucketIdAndUserId(bucketId, userId)
                                        .orElseThrow(() -> new RuntimeException(
                                                        "This user can't delete this bucket because of no authorization"));

                        // Create a detached copy of files to avoid ConcurrentModificationException
                        if (bucket.getFiles() != null && !bucket.getFiles().isEmpty()) {
                                // Create a new ArrayList from the Set to detach from Hibernate's tracking
                                List<String> fileIds = new ArrayList<>(bucket.getFiles()).stream()
                                                .map(FileMetadata::getFileId)
                                                .collect(Collectors.toList());

                                // Delete files one by one
                                for (String fileId : fileIds) {
                                        fileStorageService.deleteFile(fileId, userId);
                                }
                        }
                        bucketRepository.delete(bucket);

                } catch (Exception e) {
                        log.error("Failed to delete bucket: " + e.getMessage(), e);
                        throw new RuntimeException("Failed to delete bucket: " + e.getMessage());
                }
        }

        // Update a bucket by ID
        public BucketResponse updateBucket(BucketUpdateRequest request) {
                log.info("Updating bucket by ID: " + request.getBucketId());
                try {
                        Bucket bucket = bucketRepository
                                        .findByBucketIdAndUserId(request.getBucketId(), request.getUserId())
                                        .orElseThrow(() -> new RuntimeException("Bucket not found"));

                        // Update only when value is provided
                        if (request.getName() != null) {
                                bucket.setName(request.getName());
                        }

                        if (request.getDescription() != null) {
                                bucket.setDescription(request.getDescription());
                        }

                        bucketRepository.save(bucket);

                        return BucketResponse.builder()
                                        .bucketId(bucket.getBucketId())
                                        .name(bucket.getName())
                                        .description(bucket.getDescription())
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to update bucket by ID: " + e.getMessage());
                        throw new RuntimeException("Failed to update bucket by ID");
                }
        }

        // Create a default bucket for a user when registering a new account
        public BucketResponse createDefaultBucket(UserDTO user) {
                log.info("Creating default bucket for user: " + user.getUsername());
                try {
                        Bucket bucket = Bucket.builder()
                                        .name("Default")
                                        .user(userMapper.toUser(user))
                                        .isDefault(true)
                                        .build();

                        bucketRepository.save(bucket);

                        return BucketResponse.builder()
                                        .bucketId(bucket.getBucketId())
                                        .name(bucket.getName())
                                        .user(user)
                                        .build();
                } catch (Exception e) {
                        log.error("Failed to create default bucket: " + e.getMessage());
                        throw new RuntimeException("Failed to create default bucket");
                }
        }

}

package com.hydrangea.storage_service.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import com.hydrangea.storage_service.entity.Bucket;

public interface BucketRepository extends JpaRepository<Bucket, Long> {
    Optional<Bucket> findByNameAndUserId(String name, Long userId);

    List<Bucket> findByUserId(Long userId);

    Optional<Bucket> findByBucketIdAndUserId(String bucketId, Long userId);

    Optional<Bucket> findByUserIdAndIsDefault(Long userId, Boolean isDefault);

    @Modifying
    @Transactional
    void deleteByBucketId(String bucketId);
}

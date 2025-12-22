package com.hydrangea.storage_service.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hydrangea.storage_service.entity.File;

public interface FileRepository extends JpaRepository<File, UUID> {
    List<File> findAllByBucketId(UUID bucketId);

    Optional<File> findByIdAndBucketId(UUID id, UUID bucketId);
}

package com.hydrangea.storage_service.repository;

import com.hydrangea.storage_service.entity.Bucket;
import com.hydrangea.storage_service.entity.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {

    List<FileMetadata> findByBucketAndBucket_User_Id(Bucket bucket, Long userId);

    Optional<FileMetadata> findByFileIdAndBucket_User_Id(String fileId, Long userId);

    Optional<FileMetadata> findByFileId(String fileId);

    boolean existsByFileIdAndBucket_User_Id(String fileId, Long userId);

    boolean existsByFileId(String fileId);
}

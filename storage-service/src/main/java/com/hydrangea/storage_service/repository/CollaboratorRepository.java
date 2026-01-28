package com.hydrangea.storage_service.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hydrangea.storage_service.entity.Bucket;
import com.hydrangea.storage_service.entity.Collaborator;
import com.hydrangea.storage_service.entity.User;

public interface CollaboratorRepository extends JpaRepository<Collaborator, Long> {
    Optional<Collaborator> findByBucketAndCollaborator(Bucket bucket, User collaborator);

    boolean existsByBucketAndCollaborator(Bucket bucket, User collaborator);

    void deleteByBucketAndCollaborator(Bucket bucket, User collaborator);
}

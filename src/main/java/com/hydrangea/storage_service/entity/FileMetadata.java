package com.hydrangea.storage_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "files")
@Data
@NoArgsConstructor
public class FileMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String fileId;

    @Column(nullable = false)
    private String originalFileName;

    @Column(nullable = false)
    private Long fileSize;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private LocalDateTime uploadedAt;

    @OneToMany(mappedBy = "file", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("chunkOrder ASC")
    private List<FileChunkMapping> chunkMappings = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bucket_id", nullable = false)
    private Bucket bucket;

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }
    }

}
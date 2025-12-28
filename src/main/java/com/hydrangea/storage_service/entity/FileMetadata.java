package com.hydrangea.storage_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "files")
@Getter
@Setter
@ToString(exclude = { "bucket", "chunkMappings" })
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@NoArgsConstructor
public class FileMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
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

    @OneToMany(mappedBy = "file", cascade = CascadeType.ALL)
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
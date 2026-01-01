package com.hydrangea.storage_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "file_chunk_mappings")
@Getter
@Setter
@ToString(exclude = { "chunk", "file" })
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileChunkMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false)
    private FileMetadata file;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chunk_id", nullable = false)
    private Chunk chunk;

    @Column(nullable = false)
    private Integer chunkOrder;

    public FileChunkMapping(FileMetadata file, Chunk chunk, Integer chunkOrder) {
        this.file = file;
        this.chunk = chunk;
        this.chunkOrder = chunkOrder;
    }

}

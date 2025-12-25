package com.hydrangea.storage_service.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "storage")
@Getter
@Setter
public class StorageProperties {

    private S3 s3 = new S3();
    private Dedup dedup = new Dedup();

    @Getter
    @Setter
    public static class S3 {
        private String bucket;
        private String chunkPrefix;
        private String manifestPrefix;
    }

    @Getter
    @Setter
    public static class Dedup {
        private boolean enabled;
        private int chunkSizeBytes;
    }
}
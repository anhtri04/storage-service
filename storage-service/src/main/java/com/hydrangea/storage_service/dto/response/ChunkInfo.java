package com.hydrangea.storage_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ChunkInfo {
    private byte[] data;
    private String hash;
    private int order;
}
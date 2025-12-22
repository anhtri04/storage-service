package com.hydrangea.storage_service.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hydrangea.storage_service.dto.response.ApiResponse;
import com.hydrangea.storage_service.dto.response.BucketResponse;
import com.hydrangea.storage_service.service.BucketService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/buckets")
@RequiredArgsConstructor
public class BucketController {

    private final BucketService bucketService;

    @GetMapping
    public ApiResponse<List<BucketResponse>> getAllBuckets() {
        return bucketService.getAllBuckets();
    }

}

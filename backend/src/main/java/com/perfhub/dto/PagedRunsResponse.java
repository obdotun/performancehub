package com.perfhub.dto;

import com.perfhub.entity.SimulationRun;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class PagedRunsResponse {
    private List<SimulationRun> content;
    private int  page;
    private int  size;
    private long totalElements;
    private int  totalPages;
    private boolean first;
    private boolean last;
}
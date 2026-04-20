package com.perfhub.dto;

import lombok.Data;

@Data
public class RunRequest {
    private String simulationClass;
    /** Paramètres Gatling supplémentaires ex: -DusersCount=50 */
    private String extraParams;
}

package com.perfhub.dto;

import lombok.Data;

@Data
public class RunRequest {
    private String simulationClass;
    /** Nombre d'utilisateurs virtuels */
    private Integer users;
    /** Durée de montée en charge en secondes */
    private Integer rampDuration;
    /** Paramètres Gatling supplémentaires ex: -DusersCount=50 */
    private String extraParams;
}
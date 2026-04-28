# ── Stage 1 : Build PerfHub ──────────────────────────────────────────────────
FROM gradle:8.5-jdk17 AS builder

WORKDIR /app
COPY build.gradle settings.gradle ./
COPY src ./src

RUN gradle bootJar --no-daemon -x test

# ── Stage 2 : Runtime ─────────────────────────────────────────────────────────
# IMPORTANT : utiliser JDK (pas JRE) car les projets Gatling ont besoin
# de javac pour compiler les simulations via leur propre gradlew wrapper.
FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Installer Git + curl + unzip (nécessaires pour Bitbucket et Gradle wrapper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Pré-télécharger Gradle 7.4.2 (version utilisée par les projets Gatling GUCE CI)
# Evite un téléchargement internet à chaque premier lancement de simulation
ARG GRADLE_VERSION=7.4.2
RUN curl -fsSL "https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip" \
    -o /tmp/gradle.zip \
    && unzip -q /tmp/gradle.zip -d /opt \
    && ln -s /opt/gradle-${GRADLE_VERSION}/bin/gradle /usr/local/bin/gradle \
    && rm /tmp/gradle.zip

# Configurer le cache Gradle — partagé entre tous les projets Gatling
# Le volume Docker permet de persister ce cache entre les redémarrages
ENV GRADLE_USER_HOME=/app/.gradle

# Créer les répertoires nécessaires
RUN mkdir -p /app/storage/projects /app/storage/reports /app/data /app/.gradle

# Copier le JAR PerfHub buildé
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8085

ENV SPRING_PROFILES_ACTIVE=dev

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
# PerfHub — Plateforme d'exécution Gatling

Application type TeamCity pour lancer et monitorer des tests de performance **Gatling 3.9.0**, avec streaming de logs en temps réel et visualisation des rapports HTML.

---

## Stack technique

| Couche | Technologies |
|---|---|
| Backend | Spring Boot 3.2, Java 17, Spring Security + JWT, WebSocket STOMP |
| Persistance | H2 (dev) / PostgreSQL (prod), Spring Data JPA |
| Frontend | React 18, MUI v5, Vite |
| Exécution | ProcessBuilder → Maven / Gradle / Gatling CLI |
| Temps réel | SockJS + STOMP |

---

## Prérequis

- **Java 17+**
- **Node.js 18+**
- **Gradle** ou **Maven** installé (selon vos projets Gatling)
- **Git** installé et dans le PATH (pour les projets Bitbucket)

---

## Démarrage rapide

### 1. Backend

```bash
cd perfhub-backend
./gradlew bootRun
```

Le backend démarre sur `http://localhost:8085`

> La base H2 est créée automatiquement dans `./data/perfhub.mv.db`  
> Console H2 : http://localhost:8085/h2-console (JDBC URL: `jdbc:h2:file:./data/perfhub`)

### 2. Frontend

```bash
cd perfhub-ui
npm install
npm run dev
```

Le frontend démarre sur `http://localhost:3000`

---

## Connexion initiale

| Champ | Valeur |
|---|---|
| Nom d'utilisateur | `admin` |
| Mot de passe | `Admin@1234` |

> ⚠️ Un changement de mot de passe est demandé à la première connexion.

---

## Rôles et permissions

| Rôle | Créer projets | Lancer simulations | Voir rapports | Gérer utilisateurs |
|---|:---:|:---:|:---:|:---:|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ |
| `PERF_LEAD` | ✅ | ✅ | ✅ | ❌ |
| `PERF_ENGINEER` | ❌ | ✅ | ✅ | ❌ |
| `VIEWER` | ❌ | ❌ | ✅ | ❌ |

---

## Création d'un projet

### Depuis un ZIP

1. Zipper le projet Gatling (contenant `pom.xml` ou `build.gradle`)
2. **Projets → Nouveau projet → Fichier ZIP**
3. Uploader le ZIP

Structure attendue du ZIP :
```
mon-projet-gatling.zip
  ├── pom.xml              ← ou build.gradle
  ├── src/
  │   └── test/
  │       └── scala/
  │           └── simulations/
  │               └── MaSimulation.scala
  └── ...
```

### Depuis Bitbucket

1. **Projets → Nouveau projet → Bitbucket**
2. Renseigner l'URL du dépôt, le username (ou email) et le token HTTP d'accès
3. Récupérer les branches disponibles et sélectionner la branche cible

> Le token est injecté en mémoire uniquement, il n'est jamais stocké en base.

---

## Lancement d'une simulation

1. Ouvrir un projet → **Lancer une simulation**
2. Sélectionner la classe de simulation détectée automatiquement
3. Ajouter des paramètres optionnels ex : `-DusersCount=100 -DrampDuration=60`
4. Cliquer **Lancer**

PerfHub redirige vers le **Run Detail** où les logs s'affichent en temps réel via WebSocket.

---

## Détection du mode d'exécution

PerfHub choisit automatiquement comment lancer Gatling :

| Fichier présent | Mode | Commande |
|---|---|---|
| `gradlew` / `gradlew.bat` | Gradle | `./gradlew gatlingRun -Dgatling.simulationClass=...` |
| `pom.xml` | Maven | `mvn gatling:test -Dgatling.simulationClass=...` |
| Aucun des deux | JAR direct | `java -cp lib/* io.gatling.app.Gatling -s ...` |

---

## Rapports

Gatling génère un rapport HTML dans `storage/reports/run-{id}/`.  
Il est accessible directement dans l'interface via l'onglet **Rapport Gatling** du run.

---

## Configuration

### Passer en PostgreSQL (production)

Modifier `application.yml` :

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/perfhub
    driver-class-name: org.postgresql.Driver
    username: perfhub
    password: votre_mdp
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
```

### Changer le secret JWT

```yaml
perfhub:
  jwt:
    secret: "votre-secret-long-et-complexe-en-production"
```

### Changer les chemins de stockage

```yaml
perfhub:
  storage:
    root: /opt/perfhub/storage
    projects: /opt/perfhub/storage/projects
    reports: /opt/perfhub/storage/reports
```

---

## Structure du projet

```
PerfHub/
├── perfhub-backend/
│   ├── build.gradle
│   └── src/main/java/com/perfhub/
│       ├── PerfHubApplication.java
│       ├── config/          ← Security, WebSocket, Async
│       ├── controller/      ← Auth, Users, Projects, Runs, Reports
│       ├── dto/
│       ├── entity/          ← GatlingProject, SimulationRun, RunLog, AppUser
│       ├── enums/
│       ├── repository/
│       ├── security/        ← JWT
│       └── service/         ← Git, Project, Execution, Parser, User
│
└── perfhub-ui/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/             ← client.js, projects.js, runs.js, auth.js
        ├── components/      ← AppLayout, LogConsole, MetricCard, StatusChip
        ├── context/         ← AuthContext
        ├── hooks/           ← useRunWebSocket
        ├── pages/           ← Dashboard, Projects, ProjectDetail, RunDetail, RunsHistory, Users
        └── theme.js
```

---

## Métriques extraites de Gatling

PerfHub parse le fichier `simulation.log` (format Gatling 3.9.0) pour extraire :

- **Nombre total de requêtes**
- **Nombre de requêtes KO**
- **Temps de réponse moyen** (ms)
- **Durée totale** de la simulation

Ces métriques sont affichées dans le dashboard et l'historique.

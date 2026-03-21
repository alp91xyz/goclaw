# Multi-Tenant Solution Architecture

GoClaw is a multi-tenant AI agent gateway. This document describes the isolation architecture, authentication model, and data flow for integrators building on top of GoClaw.

---

## System Overview

```mermaid
graph TB
    subgraph Clients
        FE1[Custom Frontend A]
        FE2[Custom Frontend B]
        BOT[Chat Channels<br/>Telegram / Discord / Slack]
        CLI[CLI / API Consumer]
    end

    subgraph GoClaw Gateway
        WS[WebSocket Server<br/>Protocol v3]
        HTTP[HTTP REST API]
        AUTH[Auth Resolver]
        ROUTER[Method Router<br/>+ Tenant Context]
    end

    subgraph Core
        AGENT[Agent Loop<br/>think → act → observe]
        SCHED[Scheduler<br/>Lane-based concurrency]
        EVENTS[Event Bus<br/>+ Tenant Filter]
    end

    subgraph Data Layer
        PG[(PostgreSQL<br/>tenant_id on all tables)]
        CACHE[Session Cache<br/>tenant-prefixed keys]
        POOL[MCP Pool<br/>tenant-scoped connections]
    end

    FE1 & FE2 & CLI -->|API Key| WS & HTTP
    BOT -->|Channel Instance| AGENT
    WS & HTTP --> AUTH
    AUTH -->|tenant_id + role| ROUTER
    ROUTER --> AGENT & SCHED
    AGENT --> PG & CACHE & POOL
    EVENTS -->|filtered by tenant| WS
```

---

## Tenant Model

```mermaid
erDiagram
    TENANTS ||--o{ TENANT_USERS : "has members"
    TENANTS ||--o{ API_KEYS : "scopes keys"
    TENANTS ||--o{ AGENTS : "owns"
    TENANTS ||--o{ SESSIONS : "owns"
    TENANTS ||--o{ TEAMS : "owns"
    TENANTS ||--o{ LLM_PROVIDERS : "configures"
    TENANTS ||--o{ MCP_SERVERS : "registers"
    TENANTS ||--o{ SKILLS : "manages"

    TENANTS {
        uuid id PK
        string name
        string slug UK
        string status
        jsonb settings
    }

    TENANT_USERS {
        uuid tenant_id FK
        string user_id
        string role
    }

    API_KEYS {
        uuid id PK
        uuid tenant_id FK "nullable = system key"
        string owner_id
        string[] scopes
        boolean revoked
    }
```

**Master Tenant**: UUID `0193a5b0-7000-7000-8000-000000000001`. All legacy data defaults here. Single-tenant setups work unchanged — everything under master.

**40+ tables** carry `tenant_id` with NOT NULL constraint + foreign key to `tenants(id)`. Exception: `api_keys.tenant_id` is nullable (NULL = system-level cross-tenant key).

---

## Authentication Flow

```mermaid
flowchart TD
    START([Client Connects]) --> HAS_TOKEN{Has token?}

    HAS_TOKEN -->|Gateway token| GW[System Owner<br/>role=admin, cross-tenant]
    HAS_TOKEN -->|API key| KEY[Resolve API Key]
    HAS_TOKEN -->|No token + sender_id| PAIR{Paired device?}
    HAS_TOKEN -->|No token, no sender| FALLBACK[Fallback<br/>role=operator, master tenant]

    KEY --> KEY_TENANT{Key has tenant_id?}
    KEY_TENANT -->|Yes| SCOPED[Tenant-Scoped<br/>role from scopes]
    KEY_TENANT -->|No / NULL| CROSS[Cross-Tenant<br/>system-level key]

    PAIR -->|Yes| PAIRED[Operator<br/>master tenant or tenant_hint]
    PAIR -->|No| PAIRING[Start Pairing Flow<br/>get 8-char code]

    GW & SCOPED & CROSS & PAIRED & FALLBACK --> CTX[Inject into Context<br/>tenant_id + role + user_id]
    CTX --> METHODS[All Methods Auto-Scoped]
```

| Auth Path | Role | Tenant | Cross-Tenant |
|-----------|------|--------|:---:|
| Gateway token | admin | all | ✓ |
| API key (tenant-bound) | from scopes | key's tenant | ✗ |
| API key (system-level) | from scopes | all | ✓ |
| Browser pairing | operator | master (or hint) | ✗ |
| Fallback (no token) | operator | master | ✗ |

---

## Authorization — Role & Scope Model

```mermaid
graph LR
    subgraph Role Hierarchy
        ADMIN[admin<br/>level 3] --> OPERATOR[operator<br/>level 2]
        OPERATOR --> VIEWER[viewer<br/>level 1]
    end

    subgraph API Key Scopes
        S1[operator.admin]
        S2[operator.read]
        S3[operator.write]
        S4[operator.approvals]
        S5[operator.pairing]
    end

    ADMIN -.->|all methods| METHODS[Method Access]
    OPERATOR -.->|read + write| METHODS
    VIEWER -.->|read only| METHODS
    S1 & S2 & S3 & S4 & S5 -.->|override role| METHODS
```

**Role determines base access**. API key scopes optionally narrow it further. Admin methods (config, agent CRUD, API key management) require `admin` role. Chat/session operations require `operator`. Read-only browsing requires `viewer`.

---

## WebSocket Protocol (v3)

```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant S as Store (PG)

    C->>G: connect {token, user_id, locale}
    G->>G: Resolve auth → tenant_id + role
    G-->>C: {protocol:3, role, user_id, tenant_id, tenant_name, tenant_slug, cross_tenant}

    C->>G: agents.list {}
    G->>S: SELECT * FROM agents WHERE tenant_id = $1
    G-->>C: {agents: [...]}

    C->>G: chat.send {agent_key, message}
    G->>G: Schedule agent loop (tenant ctx)
    G-->>C: event: agent {type: "chunk", content: "..."}
    G-->>C: event: agent {type: "run.completed"}
```

**Frame types**: `req` (client→server), `res` (server→client), `event` (async push).
**Tenant context**: Injected after `connect`, applied to ALL subsequent method calls automatically.
**Events**: Server-side filtered — client only receives events matching its tenant. Fail-closed: unknown tenant events are blocked.

---

## Event Filtering

```mermaid
flowchart TD
    EVENT([Event emitted<br/>e.g. agent chunk]) --> SYS{System event?}
    SYS -->|Yes: health, presence| DELIVER[Deliver to all]
    SYS -->|No| TENANT{Client cross-tenant?}
    TENANT -->|Yes| USER_CHECK
    TENANT -->|No| MATCH{event.tenant == client.tenant?}
    MATCH -->|Yes| USER_CHECK{User/team match?}
    MATCH -->|No| BLOCK[Block ✗]

    USER_CHECK -->|Admin| DELIVER
    USER_CHECK -->|User matches| DELIVER
    USER_CHECK -->|Team matches| DELIVER
    USER_CHECK -->|No match| BLOCK
```

**Guarantee**: A tenant-scoped client **never** receives events from another tenant. The UI does not need to implement client-side filtering.

---

## Data Isolation

```mermaid
flowchart LR
    subgraph "Tenant A"
        A_AGENTS[Agents]
        A_SESSIONS[Sessions]
        A_TEAMS[Teams]
        A_MEMORY[Memory]
    end

    subgraph "Tenant B"
        B_AGENTS[Agents]
        B_SESSIONS[Sessions]
        B_TEAMS[Teams]
        B_MEMORY[Memory]
    end

    subgraph PostgreSQL
        PG_TABLE[Every table:<br/>WHERE tenant_id = $N]
    end

    A_AGENTS & A_SESSIONS & A_TEAMS & A_MEMORY --> PG_TABLE
    B_AGENTS & B_SESSIONS & B_TEAMS & B_MEMORY --> PG_TABLE
```

**Enforcement layers**:

| Layer | Mechanism |
|-------|-----------|
| SQL queries | `WHERE tenant_id = $N` on all SELECT/UPDATE/DELETE |
| INSERT | `tenantIDForInsert(ctx)` assigns tenant from context |
| UPDATE | `execMapUpdateWhereTenant()` prevents cross-tenant writes |
| Cache | Session keys prefixed with `tenantID:` |
| MCP Pool | Connection keys: `tenantID/serverName` |
| Fail-closed | Missing tenant → error (not unfiltered query) |

---

## Channel → Agent Loop Propagation

```mermaid
flowchart LR
    CI[Channel Instance<br/>tenant_id in DB] -->|load| BC[BaseChannel<br/>stores tenantID]
    BC -->|message| IM[InboundMessage<br/>carries TenantID]
    IM -->|consumer| CTX[Context Injection<br/>store.WithTenantID]
    CTX -->|schedule| LOOP[Agent Loop<br/>tenant-scoped operations]
    LOOP -->|emit| EVT[Events<br/>event.TenantID set from ctx]
    EVT -->|filter| WS[WS Clients<br/>only matching tenant]
```

Chat channels (Telegram, Discord, Slack, etc.) inherit `tenant_id` from their channel instance configuration. Every message entering the agent loop carries tenant context end-to-end.

---

## Provider Registry

```mermaid
flowchart TD
    REQ[Agent requests provider<br/>'anthropic'] --> TRY_TENANT{Tenant-specific<br/>provider exists?}
    TRY_TENANT -->|Yes| USE_TENANT[Use tenant provider<br/>key: tenantID/anthropic]
    TRY_TENANT -->|No| USE_MASTER[Fallback to master<br/>key: masterID/anthropic]
```

LLM providers use compound key `tenantID/providerName`. Tenant-specific providers (custom API keys) override master tenant defaults. This allows per-tenant provider configuration without duplicating all providers.

---

## Tenant Management

```mermaid
flowchart TD
    ADMIN[System Admin<br/>cross-tenant] -->|tenants.create| CREATE[Create Tenant<br/>name + slug]
    CREATE --> ADD_USER[tenants.users.add<br/>assign users + roles]
    ADD_USER --> CREATE_KEY[api_keys.create<br/>tenant-bound key]
    CREATE_KEY --> SHARE[Share API key<br/>with tenant user]

    USER[Regular User] -->|tenants.mine| LIST_MY[List my tenants<br/>+ roles]
```

**API Methods**:
- `tenants.list` / `tenants.get` / `tenants.create` / `tenants.update` — admin only (cross-tenant)
- `tenants.users.list` / `tenants.users.add` / `tenants.users.remove` — admin only
- `tenants.mine` — any user, returns own tenant memberships

**Tenant user roles**: owner > admin > operator > member > viewer

---

## Integration Pattern

```mermaid
sequenceDiagram
    participant SaaS as Your SaaS App
    participant GC as GoClaw Backend
    participant PG as PostgreSQL

    Note over SaaS: User signs up in your app
    SaaS->>GC: POST /v1/tenants {name, slug}
    GC->>PG: INSERT INTO tenants
    GC-->>SaaS: {id: "tenant-uuid"}

    SaaS->>GC: POST /v1/tenants/{id}/users {user_id, role}
    SaaS->>GC: POST /v1/api-keys {tenant_id, scopes}
    GC-->>SaaS: {key: "goclaw_abc123..."}

    Note over SaaS: User opens dashboard
    SaaS->>GC: WS connect {token: "goclaw_abc123..."}
    GC-->>SaaS: {tenant_id, role, tenant_name}

    SaaS->>GC: agents.list
    GC-->>SaaS: Only this tenant's agents

    SaaS->>GC: chat.send {agent_key, message}
    GC-->>SaaS: Streaming events (tenant-filtered)
```

**GoClaw as pure backend**: Your SaaS handles user auth, billing, onboarding. GoClaw handles AI agents, chat, sessions, tools, MCP. API keys bridge the two systems — each key binds a user to a tenant with specific permissions.

---

## Security Guarantees

| Threat | Mitigation |
|--------|-----------|
| Cross-tenant data access | All SQL queries include `WHERE tenant_id = $N` |
| Event leakage | Server-side `clientCanReceiveEvent` blocks mismatched tenants |
| Missing tenant context | Fail-closed: returns error, never unfiltered data |
| API key theft | Keys are hashed (SHA-256) at rest; only prefix shown in UI |
| Tenant impersonation | Tenant resolved from API key, not client-supplied header |
| Privilege escalation | Role derived from API key scopes, not client claims |

---

## Migration from Single-Tenant

No changes required. Single-tenant deployments operate entirely under the master tenant. All existing data, agents, sessions, and configurations remain accessible. Multi-tenant features activate only when new tenants are created via the management API.

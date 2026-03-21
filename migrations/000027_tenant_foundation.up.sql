-- Plan 2: Tenant Foundation
-- Master tenant UUID v7: 0193a5b0-7000-7000-8000-000000000001

-- ============================================================
-- Phase A: Create tenants + tenant_users tables
-- ============================================================

CREATE TABLE tenants (
    id         UUID PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    status     VARCHAR(20) NOT NULL DEFAULT 'active',
    settings   JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status) WHERE status = 'active';

-- Seed master tenant
INSERT INTO tenants (id, name, slug, status)
VALUES ('0193a5b0-7000-7000-8000-000000000001', 'Master', 'master', 'active');

CREATE TABLE tenant_users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id    VARCHAR(255) NOT NULL,
    role       VARCHAR(20) NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);

-- ============================================================
-- Phase B: ALTER ADD tenant_id to 30 tables
-- All default to master tenant UUID (PG 11+ metadata-only op)
-- ============================================================

-- Core tables
ALTER TABLE agents ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE sessions ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
-- api_keys: NULLABLE (NULL = system-level cross-tenant key)
ALTER TABLE api_keys ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Agent ecosystem
ALTER TABLE agent_shares ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE user_context_files ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE user_agent_profiles ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE user_agent_overrides ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE agent_config_permissions ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE agent_links ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE channel_instances ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);

-- Memory + KG
ALTER TABLE memory_documents ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE memory_chunks ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE kg_entities ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE kg_relations ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);

-- Skills
ALTER TABLE skills ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE skill_user_grants ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);

-- Cron
ALTER TABLE cron_jobs ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);

-- Tracing + Activity
ALTER TABLE traces ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE activity_logs ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE usage_snapshots ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);

-- MCP
ALTER TABLE mcp_servers ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE mcp_user_grants ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE mcp_access_requests ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);

-- Teams
ALTER TABLE agent_teams ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE team_user_grants ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);

-- Pairing + Channels
ALTER TABLE pairing_requests ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE paired_devices ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE channel_pending_messages ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);
ALTER TABLE channel_contacts ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);

-- Other
ALTER TABLE secure_cli_binaries ADD COLUMN tenant_id UUID NOT NULL DEFAULT '0193a5b0-7000-7000-8000-000000000001' REFERENCES tenants(id);

-- ============================================================
-- Phase C: Drop defaults (force explicit tenant_id for new rows)
-- ============================================================

ALTER TABLE agents ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE sessions ALTER COLUMN tenant_id DROP DEFAULT;
-- api_keys: no default to drop (nullable, no DEFAULT set)
ALTER TABLE agent_shares ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE user_context_files ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE user_agent_profiles ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE user_agent_overrides ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE agent_config_permissions ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE agent_links ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE channel_instances ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE memory_documents ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE memory_chunks ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE kg_entities ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE kg_relations ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE skills ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE skill_user_grants ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE cron_jobs ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE traces ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE activity_logs ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE usage_snapshots ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mcp_servers ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mcp_user_grants ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mcp_access_requests ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE agent_teams ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE team_user_grants ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE pairing_requests ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE paired_devices ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE channel_pending_messages ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE channel_contacts ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE secure_cli_binaries ALTER COLUMN tenant_id DROP DEFAULT;

-- ============================================================
-- Phase D: Indexes
-- ============================================================

-- Per-table tenant indexes
CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_agent_shares_tenant ON agent_shares(tenant_id);
CREATE INDEX idx_user_context_files_tenant ON user_context_files(tenant_id);
CREATE INDEX idx_user_agent_profiles_tenant ON user_agent_profiles(tenant_id);
CREATE INDEX idx_user_agent_overrides_tenant ON user_agent_overrides(tenant_id);
CREATE INDEX idx_agent_config_permissions_tenant ON agent_config_permissions(tenant_id);
CREATE INDEX idx_agent_links_tenant ON agent_links(tenant_id);
CREATE INDEX idx_channel_instances_tenant ON channel_instances(tenant_id);
CREATE INDEX idx_memory_documents_tenant ON memory_documents(tenant_id);
CREATE INDEX idx_memory_chunks_tenant ON memory_chunks(tenant_id);
CREATE INDEX idx_kg_entities_tenant ON kg_entities(tenant_id);
CREATE INDEX idx_kg_relations_tenant ON kg_relations(tenant_id);
CREATE INDEX idx_skills_tenant ON skills(tenant_id);
CREATE INDEX idx_skill_user_grants_tenant ON skill_user_grants(tenant_id);
CREATE INDEX idx_cron_jobs_tenant ON cron_jobs(tenant_id);
CREATE INDEX idx_traces_tenant ON traces(tenant_id);
CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_usage_snapshots_tenant ON usage_snapshots(tenant_id);
CREATE INDEX idx_mcp_servers_tenant ON mcp_servers(tenant_id);
CREATE INDEX idx_mcp_user_grants_tenant ON mcp_user_grants(tenant_id);
CREATE INDEX idx_mcp_access_requests_tenant ON mcp_access_requests(tenant_id);
CREATE INDEX idx_agent_teams_tenant ON agent_teams(tenant_id);
CREATE INDEX idx_team_user_grants_tenant ON team_user_grants(tenant_id);
CREATE INDEX idx_pairing_requests_tenant ON pairing_requests(tenant_id);
CREATE INDEX idx_paired_devices_tenant ON paired_devices(tenant_id);
CREATE INDEX idx_channel_pending_messages_tenant ON channel_pending_messages(tenant_id);
CREATE INDEX idx_channel_contacts_tenant ON channel_contacts(tenant_id);
CREATE INDEX idx_secure_cli_binaries_tenant ON secure_cli_binaries(tenant_id);

-- Composite indexes for Plan 3 query performance
CREATE INDEX idx_agents_tenant_active ON agents(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_tenant_user ON sessions(tenant_id, user_id);
CREATE INDEX idx_traces_tenant_time ON traces(tenant_id, created_at DESC);

-- ============================================================
-- Phase E: Seed master tenant owner from existing agents
-- ============================================================

INSERT INTO tenant_users (tenant_id, user_id, role)
SELECT DISTINCT '0193a5b0-7000-7000-8000-000000000001', owner_id, 'owner'
FROM agents
WHERE owner_id IS NOT NULL AND owner_id != ''
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================
-- Phase F: DROP custom_tools table (dead code — agent loop never wired)
-- ============================================================

DROP TABLE IF EXISTS custom_tools;

-- ============================================================
-- Phase G: Per-tenant builtin tool config overrides
-- ============================================================

CREATE TABLE builtin_tool_tenant_configs (
    tool_name  VARCHAR(100) NOT NULL REFERENCES builtin_tools(name) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    enabled    BOOLEAN,
    settings   JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tool_name, tenant_id)
);

CREATE INDEX idx_builtin_tool_tenant_configs_tenant ON builtin_tool_tenant_configs(tenant_id);

-- ============================================================
-- Phase H: Per-tenant skill config (disable system skills)
-- ============================================================

CREATE TABLE skill_tenant_configs (
    skill_id   UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    enabled    BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (skill_id, tenant_id)
);

CREATE INDEX idx_skill_tenant_configs_tenant ON skill_tenant_configs(tenant_id);

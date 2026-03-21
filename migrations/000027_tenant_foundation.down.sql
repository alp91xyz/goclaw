-- Rollback: Plan 2 Tenant Foundation

-- Phase I rollback: Restore original UNIQUE constraints
DROP INDEX IF EXISTS idx_agents_tenant_agent_key_active;
CREATE UNIQUE INDEX idx_agents_agent_key_active ON agents(agent_key) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_sessions_tenant_session_key;
ALTER TABLE sessions ADD CONSTRAINT sessions_session_key_key UNIQUE (session_key);

DROP INDEX IF EXISTS idx_skills_tenant_slug;
ALTER TABLE skills ADD CONSTRAINT skills_slug_key UNIQUE (slug);

DROP INDEX IF EXISTS idx_mcp_servers_tenant_name;
ALTER TABLE mcp_servers ADD CONSTRAINT mcp_servers_name_key UNIQUE (name);

DROP INDEX IF EXISTS idx_channel_contacts_tenant_type_sender;
ALTER TABLE channel_contacts ADD CONSTRAINT channel_contacts_channel_type_sender_id_key UNIQUE (channel_type, sender_id);

-- Drop new tables
DROP TABLE IF EXISTS skill_tenant_configs;
DROP TABLE IF EXISTS builtin_tool_tenant_configs;
DROP TABLE IF EXISTS tenant_users;

-- Drop tenant_id from all 30 tables (reverse order)
ALTER TABLE secure_cli_binaries DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE channel_contacts DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE channel_pending_messages DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE paired_devices DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE pairing_requests DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE team_user_grants DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE agent_teams DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE mcp_access_requests DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE mcp_user_grants DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE mcp_servers DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE usage_snapshots DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE activity_logs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE traces DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cron_jobs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE skill_user_grants DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE skills DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE kg_relations DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE kg_entities DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE memory_chunks DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE memory_documents DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE channel_instances DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE agent_links DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE agent_config_permissions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE user_agent_overrides DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE user_agent_profiles DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE user_context_files DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE agent_shares DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE api_keys DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE sessions DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE agents DROP COLUMN IF EXISTS tenant_id;

-- Recreate custom_tools table (restore from 000001 schema)
CREATE TABLE IF NOT EXISTS custom_tools (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT DEFAULT '',
    parameters      JSONB DEFAULT '{}',
    command         TEXT NOT NULL,
    working_dir     TEXT DEFAULT '',
    timeout_seconds INT DEFAULT 30,
    env             BYTEA,
    agent_id        UUID REFERENCES agents(id) ON DELETE CASCADE,
    enabled         BOOLEAN DEFAULT true,
    created_by      VARCHAR(255),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop tenants table last (FKs already removed)
DROP TABLE IF EXISTS tenants;

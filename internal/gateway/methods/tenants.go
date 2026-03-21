package methods

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"

	"github.com/google/uuid"

	"github.com/nextlevelbuilder/goclaw/internal/bus"
	"github.com/nextlevelbuilder/goclaw/internal/gateway"
	"github.com/nextlevelbuilder/goclaw/internal/i18n"
	"github.com/nextlevelbuilder/goclaw/internal/store"
	"github.com/nextlevelbuilder/goclaw/pkg/protocol"
)

var slugRe = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)

// TenantsMethods handles tenant management RPC methods.
type TenantsMethods struct {
	tenantStore store.TenantStore
	msgBus      *bus.MessageBus
	workspace   string // base workspace directory for tenant dirs
}

// NewTenantsMethods creates a new TenantsMethods handler.
func NewTenantsMethods(tenantStore store.TenantStore, msgBus *bus.MessageBus, workspace string) *TenantsMethods {
	return &TenantsMethods{tenantStore: tenantStore, msgBus: msgBus, workspace: workspace}
}

// Register registers tenant management RPC methods.
func (m *TenantsMethods) Register(router *gateway.MethodRouter) {
	router.Register("tenants.list", m.handleList)
	router.Register("tenants.get", m.handleGet)
	router.Register("tenants.create", m.handleCreate)
	router.Register("tenants.update", m.handleUpdate)
	router.Register("tenants.users.list", m.handleUsersList)
	router.Register("tenants.users.add", m.handleUsersAdd)
	router.Register("tenants.users.remove", m.handleUsersRemove)
}

func (m *TenantsMethods) handleList(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	if !client.IsCrossTenant() {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgPermissionDenied, "tenants.list")))
		return
	}

	tenants, err := m.tenantStore.ListTenants(ctx)
	if err != nil {
		slog.Error("tenants.list failed", "error", err)
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToList, "tenants")))
		return
	}
	if tenants == nil {
		tenants = []store.TenantData{}
	}
	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]any{"tenants": tenants}))
}

func (m *TenantsMethods) handleGet(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	if !client.IsCrossTenant() {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgPermissionDenied, "tenants.get")))
		return
	}

	var params struct {
		ID string `json:"id"`
	}
	if req.Params != nil {
		if err := json.Unmarshal(req.Params, &params); err != nil {
			client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
			return
		}
	}

	id, err := uuid.Parse(params.ID)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidID, "tenant")))
		return
	}

	tenant, err := m.tenantStore.GetTenant(ctx, id)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrNotFound, i18n.T(locale, i18n.MsgNotFound, "tenant", params.ID)))
		return
	}
	client.SendResponse(protocol.NewOKResponse(req.ID, tenant))
}

func (m *TenantsMethods) handleCreate(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	if !client.IsCrossTenant() {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgPermissionDenied, "tenants.create")))
		return
	}

	var params struct {
		Name     string `json:"name"`
		Slug     string `json:"slug"`
		Settings any    `json:"settings"`
	}
	if req.Params != nil {
		if err := json.Unmarshal(req.Params, &params); err != nil {
			client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
			return
		}
	}

	if params.Name == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRequired, "name")))
		return
	}
	if params.Slug == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRequired, "slug")))
		return
	}
	if !slugRe.MatchString(params.Slug) {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidSlug, "slug")))
		return
	}

	tenant := &store.TenantData{
		ID:     store.GenNewID(),
		Name:   params.Name,
		Slug:   params.Slug,
		Status: store.TenantStatusActive,
	}

	if err := m.tenantStore.CreateTenant(ctx, tenant); err != nil {
		slog.Error("tenants.create failed", "error", err)
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToCreate, "tenant", err.Error())))
		return
	}

	// Create workspace directory for the tenant.
	if m.workspace != "" {
		tenantDir := filepath.Join(m.workspace, "tenants", tenant.Slug)
		if err := os.MkdirAll(tenantDir, 0755); err != nil {
			slog.Warn("tenants.create: failed to create workspace dir", "dir", tenantDir, "error", err)
		}
	}

	m.emitCacheInvalidate(bus.CacheKindTenantUsers, tenant.ID.String())
	client.SendResponse(protocol.NewOKResponse(req.ID, tenant))
}

func (m *TenantsMethods) handleUpdate(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	if !client.IsCrossTenant() {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgPermissionDenied, "tenants.update")))
		return
	}

	var params struct {
		ID       string         `json:"id"`
		Name     string         `json:"name"`
		Status   string         `json:"status"`
		Settings map[string]any `json:"settings"`
	}
	if req.Params != nil {
		if err := json.Unmarshal(req.Params, &params); err != nil {
			client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
			return
		}
	}

	id, err := uuid.Parse(params.ID)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidID, "tenant")))
		return
	}

	updates := make(map[string]any)
	if params.Name != "" {
		updates["name"] = params.Name
	}
	if params.Status != "" {
		updates["status"] = params.Status
	}
	if params.Settings != nil {
		updates["settings"] = params.Settings
	}

	if len(updates) == 0 {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidUpdates)))
		return
	}

	if err := m.tenantStore.UpdateTenant(ctx, id, updates); err != nil {
		slog.Error("tenants.update failed", "error", err)
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToUpdate, "tenant", err.Error())))
		return
	}

	m.emitCacheInvalidate(bus.CacheKindTenantUsers, id.String())
	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]string{"ok": "true"}))
}

func (m *TenantsMethods) handleUsersList(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	if !client.IsCrossTenant() {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgPermissionDenied, "tenants.users.list")))
		return
	}

	var params struct {
		TenantID string `json:"tenant_id"`
	}
	if req.Params != nil {
		if err := json.Unmarshal(req.Params, &params); err != nil {
			client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
			return
		}
	}

	tid, err := uuid.Parse(params.TenantID)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidID, "tenant_id")))
		return
	}

	users, err := m.tenantStore.ListUsers(ctx, tid)
	if err != nil {
		slog.Error("tenants.users.list failed", "error", err)
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToList, "tenant users")))
		return
	}
	if users == nil {
		users = []store.TenantUserData{}
	}
	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]any{"users": users}))
}

func (m *TenantsMethods) handleUsersAdd(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	if !client.IsCrossTenant() {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgPermissionDenied, "tenants.users.add")))
		return
	}

	var params struct {
		TenantID string `json:"tenant_id"`
		UserID   string `json:"user_id"`
		Role     string `json:"role"`
	}
	if req.Params != nil {
		if err := json.Unmarshal(req.Params, &params); err != nil {
			client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
			return
		}
	}

	if params.UserID == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRequired, "user_id")))
		return
	}
	if params.Role == "" {
		params.Role = store.TenantRoleMember
	}
	validRoles := map[string]bool{
		store.TenantRoleOwner: true, store.TenantRoleAdmin: true,
		store.TenantRoleOperator: true, store.TenantRoleMember: true, store.TenantRoleViewer: true,
	}
	if !validRoles[params.Role] {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRole)))
		return
	}

	tid, err := uuid.Parse(params.TenantID)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidID, "tenant_id")))
		return
	}

	if err := m.tenantStore.AddUser(ctx, tid, params.UserID, params.Role); err != nil {
		slog.Error("tenants.users.add failed", "error", err)
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToCreate, "tenant user", err.Error())))
		return
	}

	m.emitCacheInvalidate(bus.CacheKindTenantUsers, params.UserID)
	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]string{"ok": "true"}))
}

func (m *TenantsMethods) handleUsersRemove(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	if !client.IsCrossTenant() {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgPermissionDenied, "tenants.users.remove")))
		return
	}

	var params struct {
		TenantID string `json:"tenant_id"`
		UserID   string `json:"user_id"`
	}
	if req.Params != nil {
		if err := json.Unmarshal(req.Params, &params); err != nil {
			client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
			return
		}
	}

	if params.UserID == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRequired, "user_id")))
		return
	}

	tid, err := uuid.Parse(params.TenantID)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidID, "tenant_id")))
		return
	}

	if err := m.tenantStore.RemoveUser(ctx, tid, params.UserID); err != nil {
		slog.Error("tenants.users.remove failed", "error", err)
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgFailedToDelete, "tenant user", err.Error())))
		return
	}

	m.emitCacheInvalidate(bus.CacheKindTenantUsers, params.UserID)
	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]string{"ok": "true"}))
}

func (m *TenantsMethods) emitCacheInvalidate(kind, key string) {
	if m.msgBus == nil {
		return
	}
	m.msgBus.Broadcast(bus.Event{
		Name:    protocol.EventCacheInvalidate,
		Payload: bus.CacheInvalidatePayload{Kind: kind, Key: key},
	})
}

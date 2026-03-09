package http

import (
	"encoding/json"
	"net/http"
	"regexp"

	"github.com/google/uuid"

	"github.com/nextlevelbuilder/goclaw/internal/bus"
	"github.com/nextlevelbuilder/goclaw/internal/i18n"
	"github.com/nextlevelbuilder/goclaw/internal/store"
	"github.com/nextlevelbuilder/goclaw/internal/store/pg"
	"github.com/nextlevelbuilder/goclaw/pkg/protocol"
)

const maxSkillUploadSize = 20 << 20 // 20 MB

var slugRegexp = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*[a-z0-9]$`)

// SkillsHandler handles skill management HTTP endpoints.
type SkillsHandler struct {
	skills  *pg.PGSkillStore
	baseDir string // filesystem base for skill content
	token   string
	msgBus  *bus.MessageBus
}

// NewSkillsHandler creates a handler for skill management endpoints.
func NewSkillsHandler(skills *pg.PGSkillStore, baseDir, token string, msgBus *bus.MessageBus) *SkillsHandler {
	return &SkillsHandler{skills: skills, baseDir: baseDir, token: token, msgBus: msgBus}
}

// emitCacheInvalidate broadcasts a cache invalidation event if msgBus is set.
func (h *SkillsHandler) emitCacheInvalidate(kind, key string) {
	if h.msgBus == nil {
		return
	}
	h.msgBus.Broadcast(bus.Event{
		Name:    protocol.EventCacheInvalidate,
		Payload: bus.CacheInvalidatePayload{Kind: kind, Key: key},
	})
}

// RegisterRoutes registers all skill management routes on the given mux.
func (h *SkillsHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /v1/skills", h.authMiddleware(h.handleList))
	mux.HandleFunc("POST /v1/skills/upload", h.authMiddleware(h.handleUpload))
	mux.HandleFunc("GET /v1/skills/{id}", h.authMiddleware(h.handleGet))
	mux.HandleFunc("PUT /v1/skills/{id}", h.authMiddleware(h.handleUpdate))
	mux.HandleFunc("DELETE /v1/skills/{id}", h.authMiddleware(h.handleDelete))
	mux.HandleFunc("POST /v1/skills/{id}/grants/agent", h.authMiddleware(h.handleGrantAgent))
	mux.HandleFunc("DELETE /v1/skills/{id}/grants/agent/{agentID}", h.authMiddleware(h.handleRevokeAgent))
	mux.HandleFunc("POST /v1/skills/{id}/grants/user", h.authMiddleware(h.handleGrantUser))
	mux.HandleFunc("DELETE /v1/skills/{id}/grants/user/{userID}", h.authMiddleware(h.handleRevokeUser))
	mux.HandleFunc("GET /v1/agents/{agentID}/skills", h.authMiddleware(h.handleListAgentSkills))
	mux.HandleFunc("GET /v1/skills/{id}/versions", h.authMiddleware(h.handleListVersions))
	mux.HandleFunc("GET /v1/skills/{id}/files/{path...}", h.authMiddleware(h.handleReadFile))
	mux.HandleFunc("GET /v1/skills/{id}/files", h.authMiddleware(h.handleListFiles))
}

func (h *SkillsHandler) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if h.token != "" {
			if extractBearerToken(r) != h.token {
				locale := extractLocale(r)
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": i18n.T(locale, i18n.MsgUnauthorized)})
				return
			}
		}
		userID := extractUserID(r)
		ctx := store.WithLocale(r.Context(), extractLocale(r))
		if userID != "" {
			ctx = store.WithUserID(ctx, userID)
		}
		r = r.WithContext(ctx)
		next(w, r)
	}
}

func (h *SkillsHandler) handleList(w http.ResponseWriter, r *http.Request) {
	skills := h.skills.ListSkills()
	writeJSON(w, http.StatusOK, map[string]interface{}{"skills": skills})
}

func (h *SkillsHandler) handleGet(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	id := r.PathValue("id")
	skill, ok := h.skills.GetSkill(id)
	if !ok {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": i18n.T(locale, i18n.MsgNotFound, "skill", id)})
		return
	}
	writeJSON(w, http.StatusOK, skill)
}

func (h *SkillsHandler) handleUpdate(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidID, "skill")})
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidJSON)})
		return
	}
	// Prevent changing sensitive fields
	delete(updates, "id")
	delete(updates, "owner_id")
	delete(updates, "file_path")

	if err := h.skills.UpdateSkill(id, updates); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.skills.BumpVersion()
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

func (h *SkillsHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidID, "skill")})
		return
	}

	if err := h.skills.DeleteSkill(id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.skills.BumpVersion()
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

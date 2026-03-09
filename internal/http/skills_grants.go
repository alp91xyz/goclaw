package http

import (
	"archive/zip"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	"github.com/nextlevelbuilder/goclaw/internal/bus"
	"github.com/nextlevelbuilder/goclaw/internal/i18n"
	"github.com/nextlevelbuilder/goclaw/internal/store"
)

func (h *SkillsHandler) handleListAgentSkills(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	agentIDStr := r.PathValue("agentID")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidID, "agent")})
		return
	}

	skills, err := h.skills.ListWithGrantStatus(r.Context(), agentID)
	if err != nil {
		slog.Error("failed to list skills with grant status", "agent_id", agentID, "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": i18n.T(locale, i18n.MsgFailedToList, "skills")})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"skills": skills})
}

func (h *SkillsHandler) handleGrantAgent(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	userID := store.UserIDFromContext(r.Context())
	idStr := r.PathValue("id")
	skillID, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidID, "skill")})
		return
	}

	var req struct {
		AgentID string `json:"agent_id"`
		Version int    `json:"version"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidJSON)})
		return
	}

	agentID, err := uuid.Parse(req.AgentID)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidID, "agent")})
		return
	}

	if req.Version <= 0 {
		req.Version = 1
	}

	if err := h.skills.GrantToAgent(r.Context(), skillID, agentID, req.Version, userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.skills.BumpVersion()
	h.emitCacheInvalidate(bus.CacheKindSkillGrants, "")
	writeJSON(w, http.StatusCreated, map[string]string{"ok": "true"})
}

func (h *SkillsHandler) handleRevokeAgent(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	idStr := r.PathValue("id")
	skillID, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidID, "skill")})
		return
	}

	agentIDStr := r.PathValue("agentID")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidID, "agent")})
		return
	}

	if err := h.skills.RevokeFromAgent(r.Context(), skillID, agentID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.skills.BumpVersion()
	h.emitCacheInvalidate(bus.CacheKindSkillGrants, "")
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

func (h *SkillsHandler) handleGrantUser(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	userID := store.UserIDFromContext(r.Context())
	idStr := r.PathValue("id")
	skillID, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidID, "skill")})
		return
	}

	var req struct {
		UserID string `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidJSON)})
		return
	}
	if req.UserID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgRequired, "user_id")})
		return
	}
	if err := store.ValidateUserID(req.UserID); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.skills.GrantToUser(r.Context(), skillID, req.UserID, userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.skills.BumpVersion()
	h.emitCacheInvalidate(bus.CacheKindSkillGrants, "")
	writeJSON(w, http.StatusCreated, map[string]string{"ok": "true"})
}

func (h *SkillsHandler) handleRevokeUser(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	idStr := r.PathValue("id")
	skillID, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidID, "skill")})
		return
	}

	targetUserID := r.PathValue("userID")
	if err := store.ValidateUserID(targetUserID); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := h.skills.RevokeFromUser(r.Context(), skillID, targetUserID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	h.skills.BumpVersion()
	h.emitCacheInvalidate(bus.CacheKindSkillGrants, "")
	writeJSON(w, http.StatusOK, map[string]string{"ok": "true"})
}

// --- Helpers ---

func readZipFile(f *zip.File) (string, error) {
	rc, err := f.Open()
	if err != nil {
		return "", err
	}
	defer rc.Close()
	data, err := io.ReadAll(rc)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// parseSkillFrontmatter extracts name, description, and slug from SKILL.md YAML frontmatter.
// Also returns the full parsed frontmatter as a map for DB storage.
func parseSkillFrontmatter(content string) (name, description, slug string, allFields map[string]string) {
	allFields = make(map[string]string)
	if !strings.HasPrefix(content, "---") {
		return "", "", "", allFields
	}
	end := strings.Index(content[3:], "---")
	if end < 0 {
		return "", "", "", allFields
	}
	fm := content[3 : 3+end]

	for _, line := range strings.Split(fm, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])
		val = strings.Trim(val, `"'`)
		allFields[key] = val

		switch key {
		case "name":
			name = val
		case "description":
			description = val
		case "slug":
			slug = val
		}
	}
	return
}

// isSystemArtifact returns true for OS-generated junk that should be skipped
// during ZIP extraction and file listing (e.g. __MACOSX, .DS_Store, Thumbs.db).
func isSystemArtifact(name string) bool {
	base := filepath.Base(name)
	// macOS resource fork / metadata folders and files
	if base == "__MACOSX" || strings.HasPrefix(base, "._") {
		return true
	}
	// Check if any path component is __MACOSX
	for _, part := range strings.Split(filepath.ToSlash(name), "/") {
		if part == "__MACOSX" {
			return true
		}
	}
	// Common OS junk files
	switch base {
	case ".DS_Store", "Thumbs.db", "desktop.ini", ".Spotlight-V100", ".Trashes", ".fseventsd":
		return true
	}
	return false
}

func slugify(name string) string {
	s := strings.ToLower(name)
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		return '-'
	}, s)
	// Collapse multiple dashes
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	s = strings.Trim(s, "-")
	if s == "" {
		s = "skill"
	}
	return s
}

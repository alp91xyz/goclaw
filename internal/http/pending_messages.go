package http

import (
	"encoding/json"
	"net/http"

	"github.com/nextlevelbuilder/goclaw/internal/i18n"
	"github.com/nextlevelbuilder/goclaw/internal/store"
)

// PendingMessagesHandler handles pending message HTTP endpoints.
type PendingMessagesHandler struct {
	store store.PendingMessageStore
	token string
}

func NewPendingMessagesHandler(s store.PendingMessageStore, token string) *PendingMessagesHandler {
	return &PendingMessagesHandler{store: s, token: token}
}

func (h *PendingMessagesHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /v1/pending-messages", h.authMiddleware(h.handleListGroups))
	mux.HandleFunc("GET /v1/pending-messages/messages", h.authMiddleware(h.handleListMessages))
	mux.HandleFunc("DELETE /v1/pending-messages", h.authMiddleware(h.handleDelete))
	mux.HandleFunc("POST /v1/pending-messages/compact", h.authMiddleware(h.handleCompact))
}

func (h *PendingMessagesHandler) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if h.token != "" {
			if extractBearerToken(r) != h.token {
				locale := extractLocale(r)
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": i18n.T(locale, i18n.MsgUnauthorized)})
				return
			}
		}
		locale := extractLocale(r)
		ctx := store.WithLocale(r.Context(), locale)
		r = r.WithContext(ctx)
		next(w, r)
	}
}

// GET /v1/pending-messages — list all groups with resolved titles
func (h *PendingMessagesHandler) handleListGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := h.store.ListGroups(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Resolve group titles from session metadata (best-effort, non-blocking)
	if titles, err := h.store.ResolveGroupTitles(r.Context(), groups); err == nil {
		for i := range groups {
			if t, ok := titles[groups[i].ChannelName+":"+groups[i].HistoryKey]; ok {
				groups[i].GroupTitle = t
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"groups": groups})
}

// GET /v1/pending-messages/messages?channel=X&key=Y — list messages for a group
func (h *PendingMessagesHandler) handleListMessages(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	channel := r.URL.Query().Get("channel")
	key := r.URL.Query().Get("key")
	if channel == "" || key == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgChannelKeyReq)})
		return
	}

	msgs, err := h.store.ListByKey(r.Context(), channel, key)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"messages": msgs})
}

// DELETE /v1/pending-messages?channel=X&key=Y — clear a group
func (h *PendingMessagesHandler) handleDelete(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	channel := r.URL.Query().Get("channel")
	key := r.URL.Query().Get("key")
	if channel == "" || key == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgChannelKeyReq)})
		return
	}

	if err := h.store.DeleteByKey(r.Context(), channel, key); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type compactRequest struct {
	ChannelName string `json:"channel_name"`
	HistoryKey  string `json:"history_key"`
}

// POST /v1/pending-messages/compact — MVP: clear group and return success
func (h *PendingMessagesHandler) handleCompact(w http.ResponseWriter, r *http.Request) {
	locale := store.LocaleFromContext(r.Context())
	var req compactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgInvalidJSON)})
		return
	}
	if req.ChannelName == "" || req.HistoryKey == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": i18n.T(locale, i18n.MsgRequired, "channel_name and history_key")})
		return
	}

	if err := h.store.DeleteByKey(r.Context(), req.ChannelName, req.HistoryKey); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

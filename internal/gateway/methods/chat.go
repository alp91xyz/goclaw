package methods

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"

	"github.com/nextlevelbuilder/goclaw/internal/agent"
	"github.com/nextlevelbuilder/goclaw/internal/bus"
	"github.com/nextlevelbuilder/goclaw/internal/channels/media"
	"github.com/nextlevelbuilder/goclaw/internal/gateway"
	"github.com/nextlevelbuilder/goclaw/internal/i18n"
	"github.com/nextlevelbuilder/goclaw/internal/providers"
	"github.com/nextlevelbuilder/goclaw/internal/sessions"
	"github.com/nextlevelbuilder/goclaw/internal/store"
	"github.com/nextlevelbuilder/goclaw/pkg/protocol"
)

// ChatMethods handles chat.send, chat.history, chat.abort, chat.inject.
type ChatMethods struct {
	agents      *agent.Router
	sessions    store.SessionStore
	rateLimiter *gateway.RateLimiter
}

func NewChatMethods(agents *agent.Router, sess store.SessionStore, rl *gateway.RateLimiter) *ChatMethods {
	return &ChatMethods{agents: agents, sessions: sess, rateLimiter: rl}
}

// Register adds chat methods to the router.
func (m *ChatMethods) Register(router *gateway.MethodRouter) {
	router.Register(protocol.MethodChatSend, m.handleSend)
	router.Register(protocol.MethodChatHistory, m.handleHistory)
	router.Register(protocol.MethodChatAbort, m.handleAbort)
	router.Register(protocol.MethodChatInject, m.handleInject)
}

type chatSendParams struct {
	Message    string   `json:"message"`
	AgentID    string   `json:"agentId"`
	SessionKey string   `json:"sessionKey"`
	Stream     bool     `json:"stream"`
	Media      []string `json:"media,omitempty"` // local file paths from upload endpoint
}

func (m *ChatMethods) handleSend(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	// Rate limit check per user/client
	if m.rateLimiter != nil && m.rateLimiter.Enabled() {
		key := client.UserID()
		if key == "" {
			key = client.ID()
		}
		if !m.rateLimiter.Allow(key) {
			client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRateLimitExceeded)))
			return
		}
	}

	var params chatSendParams
	if err := json.Unmarshal(req.Params, &params); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
		return
	}

	if params.AgentID == "" {
		// Extract agent key from session key (format: "agent:{key}:{rest}")
		// so resuming an existing session routes to the correct agent.
		if params.SessionKey != "" {
			if agentKey, _ := sessions.ParseSessionKey(params.SessionKey); agentKey != "" {
				params.AgentID = agentKey
			}
		}
		if params.AgentID == "" {
			params.AgentID = "default"
		}
	}

	loop, err := m.agents.Get(params.AgentID)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrNotFound, err.Error()))
		return
	}

	userID := client.UserID()
	if userID == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgUserIDRequired)))
		return
	}

	runID := uuid.NewString()
	sessionKey := params.SessionKey
	if sessionKey == "" {
		sessionKey = sessions.SessionKey(params.AgentID, "ws-"+client.ID())
	}

	// Inject user_id into context for downstream stores/tools
	runCtxBase := ctx
	if userID != "" {
		runCtxBase = store.WithUserID(runCtxBase, userID)
	}

	// Create cancellable context for abort support (matching TS AbortController pattern).
	runCtx, cancel := context.WithCancel(runCtxBase)
	m.agents.RegisterRun(runID, sessionKey, params.AgentID, cancel)

	// Run agent asynchronously - events are broadcast via the event system
	go func() {
		defer m.agents.UnregisterRun(runID)
		defer cancel()

		// Convert string paths to bus.MediaFile with MIME detection.
		var mediaFiles []bus.MediaFile
		var mediaInfos []media.MediaInfo
		for _, p := range params.Media {
			mimeType := media.DetectMIMEType(p)
			mediaFiles = append(mediaFiles, bus.MediaFile{Path: p, MimeType: mimeType})
			mediaInfos = append(mediaInfos, media.MediaInfo{
				Type:        media.MediaKindFromMime(mimeType),
				FilePath:    p,
				ContentType: mimeType,
			})
		}

		// Prepend media tags so the LLM knows what media is attached.
		message := params.Message
		if len(mediaInfos) > 0 {
			if tags := media.BuildMediaTags(mediaInfos); tags != "" {
				if message != "" {
					message = tags + "\n\n" + message
				} else {
					message = tags
				}
			}
		}

		result, err := loop.Run(runCtx, agent.RunRequest{
			SessionKey: sessionKey,
			Message:    message,
			Media:      mediaFiles,
			Channel:    "ws",
			ChatID:     client.ID(),
			RunID:      runID,
			UserID:     userID,
			Stream:     params.Stream,
		})

		if err != nil {
			// Don't send error if context was cancelled (abort)
			if runCtx.Err() != nil {
				return
			}
			client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, err.Error()))
			return
		}

		resp := map[string]interface{}{
			"runId":   result.RunID,
			"content": result.Content,
			"usage":   result.Usage,
		}
		if len(result.Media) > 0 {
			resp["media"] = result.Media
		}
		client.SendResponse(protocol.NewOKResponse(req.ID, resp))
	}()
}

type chatHistoryParams struct {
	AgentID    string `json:"agentId"`
	SessionKey string `json:"sessionKey"`
}

func (m *ChatMethods) handleHistory(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	var params chatHistoryParams
	if err := json.Unmarshal(req.Params, &params); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
		return
	}

	if params.AgentID == "" {
		params.AgentID = "default"
	}

	sessionKey := params.SessionKey
	if sessionKey == "" {
		sessionKey = sessions.SessionKey(params.AgentID, "ws-"+client.ID())
	}

	history := m.sessions.GetHistory(sessionKey)

	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]interface{}{
		"messages": history,
	}))
}

// handleInject injects a message into a session transcript without running the agent.
// Matching TS chat.inject (src/gateway/server-methods/chat.ts:686-746).
func (m *ChatMethods) handleInject(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	var params struct {
		SessionKey string `json:"sessionKey"`
		Message    string `json:"message"`
		Label      string `json:"label"`
	}
	if err := json.Unmarshal(req.Params, &params); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
		return
	}

	if params.SessionKey == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRequired, "sessionKey")))
		return
	}
	if params.Message == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgMsgRequired)))
		return
	}

	// Truncate label
	if len(params.Label) > 100 {
		params.Label = params.Label[:100]
	}

	// Build content text
	text := params.Message
	if params.Label != "" {
		text = "[" + params.Label + "]\n\n" + params.Message
	}

	// Create an assistant message with gateway-injected metadata
	messageID := uuid.NewString()
	m.sessions.AddMessage(params.SessionKey, providers.Message{
		Role:    "assistant",
		Content: text,
	})

	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]interface{}{
		"ok":        true,
		"messageId": messageID,
	}))
}

// handleAbort cancels running agent invocations.
// Matching TS chat-abort.ts: validates sessionKey, supports per-runId or per-session abort.
//
// Params:
//
//	{ sessionKey: string, runId?: string }
//
// Response:
//
//	{ ok: true, aborted: bool, runIds: []string }
func (m *ChatMethods) handleAbort(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	var params struct {
		RunID      string `json:"runId"`
		SessionKey string `json:"sessionKey"`
	}
	if err := json.Unmarshal(req.Params, &params); err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidJSON)))
		return
	}

	if params.SessionKey == "" && params.RunID == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRequired, "sessionKey or runId")))
		return
	}

	var abortedIDs []string

	if params.RunID != "" {
		// Abort specific run (with sessionKey authorization)
		if m.agents.AbortRun(params.RunID, params.SessionKey) {
			abortedIDs = append(abortedIDs, params.RunID)
		}
	} else {
		// Abort all runs for session
		abortedIDs = m.agents.AbortRunsForSession(params.SessionKey)
	}

	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]interface{}{
		"ok":      true,
		"aborted": len(abortedIDs) > 0,
		"runIds":  abortedIDs,
	}))
}

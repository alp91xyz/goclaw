package methods

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"

	"github.com/nextlevelbuilder/goclaw/internal/gateway"
	"github.com/nextlevelbuilder/goclaw/internal/i18n"
	"github.com/nextlevelbuilder/goclaw/internal/store"
	"github.com/nextlevelbuilder/goclaw/pkg/protocol"
)

// DelegationsMethods handles delegations.* RPC methods.
type DelegationsMethods struct {
	teamStore store.TeamStore
}

func NewDelegationsMethods(teamStore store.TeamStore) *DelegationsMethods {
	return &DelegationsMethods{teamStore: teamStore}
}

func (m *DelegationsMethods) Register(router *gateway.MethodRouter) {
	router.Register(protocol.MethodDelegationsList, m.handleList)
	router.Register(protocol.MethodDelegationsGet, m.handleGet)
}

func (m *DelegationsMethods) handleList(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	if m.teamStore == nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgDelegationsUnavailable)))
		return
	}

	var params struct {
		SourceAgentID string `json:"source_agent_id"`
		TargetAgentID string `json:"target_agent_id"`
		TeamID        string `json:"team_id"`
		UserID        string `json:"user_id"`
		Status        string `json:"status"`
		Limit         int    `json:"limit"`
		Offset        int    `json:"offset"`
	}
	if req.Params != nil {
		_ = json.Unmarshal(req.Params, &params)
	}

	opts := store.DelegationHistoryListOpts{
		UserID: params.UserID,
		Status: params.Status,
		Limit:  params.Limit,
		Offset: params.Offset,
	}

	if params.SourceAgentID != "" {
		if id, err := uuid.Parse(params.SourceAgentID); err == nil {
			opts.SourceAgentID = &id
		}
	}
	if params.TargetAgentID != "" {
		if id, err := uuid.Parse(params.TargetAgentID); err == nil {
			opts.TargetAgentID = &id
		}
	}
	if params.TeamID != "" {
		if id, err := uuid.Parse(params.TeamID); err == nil {
			opts.TeamID = &id
		}
	}

	records, total, err := m.teamStore.ListDelegationHistory(ctx, opts)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, err.Error()))
		return
	}

	// Truncate results for WS transport
	const maxResultRunes = 500
	for i := range records {
		if records[i].Result != nil {
			r := []rune(*records[i].Result)
			if len(r) > maxResultRunes {
				s := string(r[:maxResultRunes]) + "..."
				records[i].Result = &s
			}
		}
	}

	client.SendResponse(protocol.NewOKResponse(req.ID, map[string]interface{}{
		"records": records,
		"total":   total,
	}))
}

func (m *DelegationsMethods) handleGet(ctx context.Context, client *gateway.Client, req *protocol.RequestFrame) {
	locale := store.LocaleFromContext(ctx)
	if m.teamStore == nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, i18n.T(locale, i18n.MsgDelegationsUnavailable)))
		return
	}

	var params struct {
		ID string `json:"id"`
	}
	if req.Params != nil {
		_ = json.Unmarshal(req.Params, &params)
	}
	if params.ID == "" {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgRequired, "id")))
		return
	}

	id, err := uuid.Parse(params.ID)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidID, "id")))
		return
	}

	record, err := m.teamStore.GetDelegationHistory(ctx, id)
	if err != nil {
		client.SendResponse(protocol.NewErrorResponse(req.ID, protocol.ErrInternal, err.Error()))
		return
	}

	// Truncate result for WS transport
	const maxResultRunes = 8000
	if record.Result != nil {
		r := []rune(*record.Result)
		if len(r) > maxResultRunes {
			s := string(r[:maxResultRunes]) + "..."
			record.Result = &s
		}
	}

	client.SendResponse(protocol.NewOKResponse(req.ID, record))
}

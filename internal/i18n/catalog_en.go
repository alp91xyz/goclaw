package i18n

func init() {
	register(LocaleEN, map[string]string{
		// Common validation
		MsgRequired:         "%s is required",
		MsgInvalidID:        "invalid %s ID",
		MsgNotFound:         "%s not found: %s",
		MsgAlreadyExists:    "%s already exists: %s",
		MsgInvalidRequest:   "invalid request: %s",
		MsgInvalidJSON:      "invalid JSON",
		MsgUnauthorized:     "unauthorized",
		MsgPermissionDenied: "permission denied: insufficient role for %s",
		MsgInternalError:    "internal error: %s",
		MsgInvalidSlug:      "%s must be a valid slug (lowercase letters, numbers, hyphens only)",
		MsgFailedToList:     "failed to list %s",
		MsgFailedToCreate:   "failed to create %s: %s",
		MsgFailedToUpdate:   "failed to update %s: %s",
		MsgFailedToDelete:   "failed to delete %s: %s",
		MsgFailedToSave:     "failed to save %s: %s",
		MsgInvalidUpdates:   "invalid updates",

		// Agent
		MsgAgentNotFound:       "agent not found: %s",
		MsgCannotDeleteDefault: "cannot delete the default agent",
		MsgUserCtxRequired:     "user context required",

		// Chat
		MsgRateLimitExceeded: "rate limit exceeded — please wait",
		MsgNoUserMessage:     "no user message found",
		MsgUserIDRequired:    "user_id is required",
		MsgMsgRequired:       "message is required",

		// Channel instances
		MsgInvalidChannelType: "invalid channel_type",
		MsgInstanceNotFound:   "instance not found",

		// Cron
		MsgJobNotFound:     "job not found",
		MsgInvalidCronExpr: "invalid cron expression: %s",

		// Config
		MsgConfigHashMismatch: "config has changed (hash mismatch)",

		// Exec approval
		MsgExecApprovalDisabled: "exec approval is not enabled",

		// Pairing
		MsgSenderChannelRequired: "senderId and channel are required",
		MsgCodeRequired:          "code is required",
		MsgSenderIDRequired:      "sender_id is required",

		// HTTP API
		MsgInvalidAuth:           "invalid authentication",
		MsgMsgsRequired:          "messages is required",
		MsgUserIDHeader:          "X-GoClaw-User-Id header is required in managed mode",
		MsgFileTooLarge:          "file too large or invalid multipart form",
		MsgMissingFileField:      "missing 'file' field",
		MsgInvalidFilename:       "invalid filename",
		MsgChannelKeyReq:         "channel and key are required",
		MsgMethodNotAllowed:      "method not allowed",
		MsgStreamingNotSupported: "streaming not supported",
		MsgOwnerOnly:             "only owner can %s",
		MsgNoAccess:              "no access to this %s",
		MsgAlreadySummoning:      "agent is already being summoned",
		MsgSummoningUnavailable:  "summoning not available",
		MsgNoDescription:         "agent has no description to resummon from",
		MsgInvalidPath:           "invalid path",

		// Scheduler
		MsgQueueFull:    "session queue is full",
		MsgShuttingDown: "gateway is shutting down, please retry shortly",

		// Provider
		MsgProviderReqFailed: "%s: request failed: %s",

		// Unknown method
		MsgUnknownMethod: "unknown method: %s",

		// Not implemented
		MsgNotImplemented: "%s not yet implemented",

		// Agent links
		MsgLinksNotConfigured:   "agent links not configured",
		MsgInvalidDirection:     "direction must be outbound, inbound, or bidirectional",
		MsgSourceTargetSame:     "source and target must be different agents",
		MsgCannotDelegateOpen:   "cannot delegate to open agents — only predefined agents can be delegation targets",
		MsgNoUpdatesProvided:    "no updates provided",
		MsgInvalidLinkStatus:    "status must be active or disabled",

		// Teams
		MsgTeamsNotConfigured:   "teams not configured",
		MsgAgentIsTeamLead:      "agent is already the team lead",
		MsgCannotRemoveTeamLead: "cannot remove the team lead",

		// Delegations
		MsgDelegationsUnavailable: "delegations not available",

		// Channels
		MsgCannotDeleteDefaultInst: "cannot delete default channel instance",

		// Skills
		MsgSkillsUpdateNotSupported: "skills.update not supported for file-based skills",
		MsgCannotResolveSkillID:     "cannot resolve skill ID for file-based skill",

		// Logs
		MsgInvalidLogAction: "action must be 'start' or 'stop'",

		// Config
		MsgRawConfigRequired: "raw config is required",
		MsgRawPatchRequired:  "raw patch is required",

		// Storage / File
		MsgCannotDeleteSkillsDir: "cannot delete skills directories",
		MsgFailedToReadFile:      "failed to read file",
		MsgFileNotFound:          "file not found",
		MsgInvalidVersion:        "invalid version",
		MsgVersionNotFound:       "version not found",
		MsgFailedToDeleteFile:    "failed to delete",

		// OAuth
		MsgNoPendingOAuth:    "no pending OAuth flow",
		MsgFailedToSaveToken: "failed to save token",

		// Knowledge Graph
		MsgEntityIDRequired:       "entity_id is required",
		MsgEntityFieldsRequired:   "external_id, name, and entity_type are required",
		MsgTextRequired:           "text is required",
		MsgProviderModelRequired:  "provider and model are required",
		MsgInvalidProviderOrModel: "invalid provider or model",
	})
}

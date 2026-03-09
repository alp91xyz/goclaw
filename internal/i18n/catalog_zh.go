package i18n

func init() {
	register(LocaleZH, map[string]string{
		// Common validation
		MsgRequired:         "%s 是必填项",
		MsgInvalidID:        "无效的 %s ID",
		MsgNotFound:         "未找到 %s：%s",
		MsgAlreadyExists:    "%s 已存在：%s",
		MsgInvalidRequest:   "无效请求：%s",
		MsgInvalidJSON:      "无效的 JSON",
		MsgUnauthorized:     "未授权",
		MsgPermissionDenied: "权限不足：无法访问 %s",
		MsgInternalError:    "内部错误：%s",
		MsgInvalidSlug:      "%s 必须是有效的 slug（小写字母、数字、连字符）",
		MsgFailedToList:     "获取 %s 列表失败",
		MsgFailedToCreate:   "创建 %s 失败：%s",
		MsgFailedToUpdate:   "更新 %s 失败：%s",
		MsgFailedToDelete:   "删除 %s 失败：%s",
		MsgFailedToSave:     "保存 %s 失败：%s",
		MsgInvalidUpdates:   "更新内容无效",

		// Agent
		MsgAgentNotFound:       "未找到Agent：%s",
		MsgCannotDeleteDefault: "无法删除默认Agent",
		MsgUserCtxRequired:     "需要用户上下文",

		// Chat
		MsgRateLimitExceeded: "请求频率超限 — 请稍候",
		MsgNoUserMessage:     "未找到用户消息",
		MsgUserIDRequired:    "user_id 是必填项",
		MsgMsgRequired:       "消息是必填项",

		// Channel instances
		MsgInvalidChannelType: "Channel类型无效",
		MsgInstanceNotFound:   "未找到实例",

		// Cron
		MsgJobNotFound:     "未找到任务",
		MsgInvalidCronExpr: "无效的 cron 表达式：%s",

		// Config
		MsgConfigHashMismatch: "配置已更改（hash 不匹配）",

		// Exec approval
		MsgExecApprovalDisabled: "执行审批未启用",

		// Pairing
		MsgSenderChannelRequired: "senderId 和 channel 是必填项",
		MsgCodeRequired:          "代码是必填项",
		MsgSenderIDRequired:      "sender_id 是必填项",

		// HTTP API
		MsgInvalidAuth:           "身份验证无效",
		MsgMsgsRequired:          "messages 是必填项",
		MsgUserIDHeader:          "托管模式下需要 X-GoClaw-User-Id 请求头",
		MsgFileTooLarge:          "文件过大或 multipart 表单无效",
		MsgMissingFileField:      "缺少 'file' 字段",
		MsgInvalidFilename:       "文件名无效",
		MsgChannelKeyReq:         "channel 和 key 是必填项",
		MsgMethodNotAllowed:      "不允许的请求方法",
		MsgStreamingNotSupported: "不支持流式传输",
		MsgOwnerOnly:             "只有所有者才能%s",
		MsgNoAccess:              "无权访问此%s",
		MsgAlreadySummoning:      "Agent正在被召唤中",
		MsgSummoningUnavailable:  "召唤功能不可用",
		MsgNoDescription:         "Agent没有可供重新召唤的描述",
		MsgInvalidPath:           "路径无效",

		// Scheduler
		MsgQueueFull:    "Session队列已满",
		MsgShuttingDown: "网关正在关闭，请稍后重试",

		// Provider
		MsgProviderReqFailed: "%s：请求失败：%s",

		// Unknown method
		MsgUnknownMethod: "未知方法：%s",

		// Not implemented
		MsgNotImplemented: "%s 尚未实现",

		// Agent links
		MsgLinksNotConfigured:   "Agent链接未配置",
		MsgInvalidDirection:     "方向必须是 outbound、inbound 或 bidirectional",
		MsgSourceTargetSame:     "源和目标必须是不同的Agent",
		MsgCannotDelegateOpen:   "无法委派给开放型Agent — 只有预定义Agent才能作为委派目标",
		MsgNoUpdatesProvided:    "未提供更新内容",
		MsgInvalidLinkStatus:    "状态必须是 active 或 disabled",

		// Teams
		MsgTeamsNotConfigured:   "团队未配置",
		MsgAgentIsTeamLead:      "该Agent已是团队负责人",
		MsgCannotRemoveTeamLead: "无法移除团队负责人",

		// Delegations
		MsgDelegationsUnavailable: "委派功能不可用",

		// Channels
		MsgCannotDeleteDefaultInst: "无法删除默认Channel实例",

		// Skills
		MsgSkillsUpdateNotSupported: "基于文件的Skill不支持 skills.update",
		MsgCannotResolveSkillID:     "无法解析基于文件的Skill ID",

		// Logs
		MsgInvalidLogAction: "action 必须是 'start' 或 'stop'",

		// Config
		MsgRawConfigRequired: "raw 配置是必填项",
		MsgRawPatchRequired:  "raw 补丁是必填项",

		// Storage / File
		MsgCannotDeleteSkillsDir: "无法删除Skill目录",
		MsgFailedToReadFile:      "读取文件失败",
		MsgFileNotFound:          "文件未找到",
		MsgInvalidVersion:        "版本无效",
		MsgVersionNotFound:       "未找到该版本",
		MsgFailedToDeleteFile:    "删除失败",

		// OAuth
		MsgNoPendingOAuth:    "没有待处理的 OAuth 流程",
		MsgFailedToSaveToken: "保存令牌失败",

		// Knowledge Graph
		MsgEntityIDRequired:       "entity_id 是必填项",
		MsgEntityFieldsRequired:   "external_id、name 和 entity_type 是必填项",
		MsgTextRequired:           "text 是必填项",
		MsgProviderModelRequired:  "provider 和 model 是必填项",
		MsgInvalidProviderOrModel: "provider 或 model 无效",
	})
}

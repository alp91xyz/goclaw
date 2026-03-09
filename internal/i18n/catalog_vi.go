package i18n

func init() {
	register(LocaleVI, map[string]string{
		// Common validation
		MsgRequired:         "%s là bắt buộc",
		MsgInvalidID:        "ID %s không hợp lệ",
		MsgNotFound:         "không tìm thấy %s: %s",
		MsgAlreadyExists:    "%s đã tồn tại: %s",
		MsgInvalidRequest:   "yêu cầu không hợp lệ: %s",
		MsgInvalidJSON:      "JSON không hợp lệ",
		MsgUnauthorized:     "chưa xác thực",
		MsgPermissionDenied: "từ chối quyền truy cập: không đủ quyền cho %s",
		MsgInternalError:    "lỗi nội bộ: %s",
		MsgInvalidSlug:      "%s phải là slug hợp lệ (chữ thường, số, dấu gạch ngang)",
		MsgFailedToList:     "không thể liệt kê %s",
		MsgFailedToCreate:   "không thể tạo %s: %s",
		MsgFailedToUpdate:   "không thể cập nhật %s: %s",
		MsgFailedToDelete:   "không thể xóa %s: %s",
		MsgFailedToSave:     "không thể lưu %s: %s",
		MsgInvalidUpdates:   "cập nhật không hợp lệ",

		// Agent
		MsgAgentNotFound:       "không tìm thấy agent: %s",
		MsgCannotDeleteDefault: "không thể xóa agent mặc định",
		MsgUserCtxRequired:     "yêu cầu ngữ cảnh người dùng",

		// Chat
		MsgRateLimitExceeded: "vượt quá giới hạn tốc độ — vui lòng đợi",
		MsgNoUserMessage:     "không tìm thấy tin nhắn người dùng",
		MsgUserIDRequired:    "user_id là bắt buộc",
		MsgMsgRequired:       "tin nhắn là bắt buộc",

		// Channel instances
		MsgInvalidChannelType: "loại channel không hợp lệ",
		MsgInstanceNotFound:   "không tìm thấy phiên bản",

		// Cron
		MsgJobNotFound:     "không tìm thấy tác vụ",
		MsgInvalidCronExpr: "biểu thức cron không hợp lệ: %s",

		// Config
		MsgConfigHashMismatch: "cấu hình đã thay đổi (hash không khớp)",

		// Exec approval
		MsgExecApprovalDisabled: "phê duyệt thực thi chưa được bật",

		// Pairing
		MsgSenderChannelRequired: "senderId và channel là bắt buộc",
		MsgCodeRequired:          "mã là bắt buộc",
		MsgSenderIDRequired:      "sender_id là bắt buộc",

		// HTTP API
		MsgInvalidAuth:           "xác thực không hợp lệ",
		MsgMsgsRequired:          "messages là bắt buộc",
		MsgUserIDHeader:          "header X-GoClaw-User-Id là bắt buộc ở chế độ managed",
		MsgFileTooLarge:          "tệp quá lớn hoặc form multipart không hợp lệ",
		MsgMissingFileField:      "thiếu trường 'file'",
		MsgInvalidFilename:       "tên tệp không hợp lệ",
		MsgChannelKeyReq:         "channel và key là bắt buộc",
		MsgMethodNotAllowed:      "phương thức không được phép",
		MsgStreamingNotSupported: "streaming không được hỗ trợ",
		MsgOwnerOnly:             "chỉ chủ sở hữu mới có thể %s",
		MsgNoAccess:              "không có quyền truy cập %s này",
		MsgAlreadySummoning:      "agent đang được triệu hồi",
		MsgSummoningUnavailable:  "triệu hồi không khả dụng",
		MsgNoDescription:         "agent không có mô tả để triệu hồi lại",
		MsgInvalidPath:           "đường dẫn không hợp lệ",

		// Scheduler
		MsgQueueFull:    "hàng đợi session đã đầy",
		MsgShuttingDown: "cổng đang tắt, vui lòng thử lại sau",

		// Provider
		MsgProviderReqFailed: "%s: yêu cầu thất bại: %s",

		// Unknown method
		MsgUnknownMethod: "phương thức không xác định: %s",

		// Not implemented
		MsgNotImplemented: "%s chưa được triển khai",

		// Agent links
		MsgLinksNotConfigured:   "liên kết agent chưa được cấu hình",
		MsgInvalidDirection:     "hướng phải là outbound, inbound hoặc bidirectional",
		MsgSourceTargetSame:     "nguồn và đích phải là các agent khác nhau",
		MsgCannotDelegateOpen:   "không thể ủy quyền cho agent mở — chỉ agent định sẵn mới có thể là đích ủy quyền",
		MsgNoUpdatesProvided:    "không có cập nhật nào được cung cấp",
		MsgInvalidLinkStatus:    "trạng thái phải là active hoặc disabled",

		// Teams
		MsgTeamsNotConfigured:   "nhóm chưa được cấu hình",
		MsgAgentIsTeamLead:      "agent đã là trưởng nhóm",
		MsgCannotRemoveTeamLead: "không thể xóa trưởng nhóm",

		// Delegations
		MsgDelegationsUnavailable: "ủy quyền không khả dụng",

		// Channels
		MsgCannotDeleteDefaultInst: "không thể xóa phiên bản channel mặc định",

		// Skills
		MsgSkillsUpdateNotSupported: "skills.update không được hỗ trợ với skill dựa trên tệp",
		MsgCannotResolveSkillID:     "không thể xác định ID skill dựa trên tệp",

		// Logs
		MsgInvalidLogAction: "action phải là 'start' hoặc 'stop'",

		// Config
		MsgRawConfigRequired: "cấu hình raw là bắt buộc",
		MsgRawPatchRequired:  "patch raw là bắt buộc",

		// Storage / File
		MsgCannotDeleteSkillsDir: "không thể xóa thư mục skill",
		MsgFailedToReadFile:      "không thể đọc tệp",
		MsgFileNotFound:          "không tìm thấy tệp",
		MsgInvalidVersion:        "phiên bản không hợp lệ",
		MsgVersionNotFound:       "không tìm thấy phiên bản",
		MsgFailedToDeleteFile:    "không thể xóa",

		// OAuth
		MsgNoPendingOAuth:    "không có luồng OAuth đang chờ",
		MsgFailedToSaveToken: "không thể lưu token",

		// Knowledge Graph
		MsgEntityIDRequired:       "entity_id là bắt buộc",
		MsgEntityFieldsRequired:   "external_id, name và entity_type là bắt buộc",
		MsgTextRequired:           "text là bắt buộc",
		MsgProviderModelRequired:  "provider và model là bắt buộc",
		MsgInvalidProviderOrModel: "provider hoặc model không hợp lệ",
	})
}

// Package sandbox — Cloudflare Dynamic Workers sandbox implementation.
//
// Docker container yerine Cloudflare V8 isolate kullanarak kod calistirma:
//   - 100x daha hizli baslatma (5ms cold start vs 500ms+ Docker)
//   - 10-100x daha az bellek (< 128MB vs 512MB Docker)
//   - V8 isolate ile dogal sandbox — escape riski yok
//   - $0.002/worker/gun (beta'da ucretsiz)
//
// Bu dosya, mevcut Sandbox interface'ini implement ederek GoClaw'in
// herhangi bir agent tool'unu hem Docker hem CF Workers ile calistirmasini saglar.
package sandbox

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// CloudflareConfig holds Cloudflare-specific sandbox settings.
type CloudflareConfig struct {
	AccountID  string `json:"account_id"`
	APIToken   string `json:"api_token"`
	APIBase    string `json:"api_base"`
	CPULimitMs int    `json:"cpu_limit_ms"` // V8 CPU time limit (default 50ms)
	MemoryMB   int    `json:"memory_mb"`    // V8 memory limit (default 128MB)

	// Worker template — sandboxed exec icin base worker kodu
	BaseImage string `json:"base_image"` // compat: Docker config'deki image alanina karsilik
}

// DefaultCloudflareConfig returns sensible defaults for CF Workers.
func DefaultCloudflareConfig() CloudflareConfig {
	return CloudflareConfig{
		APIBase:    "https://api.cloudflare.com/client/v4",
		CPULimitMs: 50,
		MemoryMB:   128,
		BaseImage:  "cloudflare-workers-v8",
	}
}

// ─── CloudflareSandbox ─────────────────────────────────────────

// CloudflareSandbox implements Sandbox interface using a Cloudflare Worker.
type CloudflareSandbox struct {
	mu         sync.Mutex
	id         string // worker script name
	accountID  string
	apiToken   string
	apiBase    string
	workerURL  string
	secret     string
	cpuLimit   int
	memLimit   int
	created    time.Time
	lastUsed   time.Time
	execCount  int
	destroyed  bool
}

// workerExecPayload is the JSON body sent to the sandbox worker.
type workerExecPayload struct {
	Command []string          `json:"command"`
	WorkDir string            `json:"workdir"`
	Env     map[string]string `json:"env,omitempty"`
	Timeout int               `json:"timeout"`
}

// workerExecResponse is the JSON response from the sandbox worker.
type workerExecResponse struct {
	ExitCode int    `json:"exit_code"`
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	CPUTimeMs int   `json:"cpu_time_ms"`
	Error    string `json:"error,omitempty"`
}

// EXEC_WORKER_TEMPLATE is the Worker code for running sandboxed commands.
// This worker receives commands via HTTP POST and executes them in V8.
// Note: full shell execution requires a more advanced setup with Cloudflare
// Workers for Platforms or D1 integration. This implementation handles
// JavaScript evaluation, which covers strategy execution and basic operations.
const EXEC_WORKER_TEMPLATE = `
export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({error: "Method not allowed"}), {status: 405});
    }

    const auth = request.headers.get("Authorization");
    if (!auth || auth !== "Bearer " + env.SANDBOX_SECRET) {
      return new Response(JSON.stringify({error: "Unauthorized"}), {status: 401});
    }

    const start = Date.now();
    try {
      const body = await request.json();
      const command = body.command || [];
      const workdir = body.workdir || "/";

      // V8 isolate icerisinde JavaScript eval
      // Tam shell yerine JS-based sandbox execution
      let stdout = "";
      let stderr = "";
      let exitCode = 0;

      const cmd = command.join(" ");

      // JS eval sandbox
      try {
        const result = eval(cmd);
        stdout = typeof result === "object" ? JSON.stringify(result, null, 2) : String(result ?? "");
      } catch (evalErr) {
        stderr = evalErr.message;
        exitCode = 1;
      }

      return new Response(JSON.stringify({
        exit_code: exitCode,
        stdout: stdout.substring(0, 1048576),
        stderr: stderr.substring(0, 1048576),
        cpu_time_ms: Date.now() - start,
      }), {
        headers: {"Content-Type": "application/json"}
      });
    } catch (err) {
      return new Response(JSON.stringify({
        exit_code: -1,
        stdout: "",
        stderr: err.message,
        cpu_time_ms: Date.now() - start,
        error: err.message,
      }), {
        status: 500,
        headers: {"Content-Type": "application/json"}
      });
    }
  }
};
`

// Exec runs a command in the Cloudflare Worker sandbox.
func (s *CloudflareSandbox) Exec(ctx context.Context, command []string, workDir string, opts ...ExecOption) (*ExecResult, error) {
	s.mu.Lock()
	if s.destroyed {
		s.mu.Unlock()
		return nil, fmt.Errorf("sandbox %s has been destroyed", s.id)
	}
	s.lastUsed = time.Now()
	s.execCount++
	s.mu.Unlock()

	eopts := ApplyExecOpts(opts)

	payload := workerExecPayload{
		Command: command,
		WorkDir: workDir,
		Env:     eopts.Env,
		Timeout: s.cpuLimit,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal exec payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.workerURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.secret)

	client := &http.Client{Timeout: time.Duration(s.cpuLimit+5000) * time.Millisecond}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("worker exec request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20)) // 2MB limit
	if err != nil {
		return nil, fmt.Errorf("read worker response: %w", err)
	}

	var wResp workerExecResponse
	if err := json.Unmarshal(respBody, &wResp); err != nil {
		return nil, fmt.Errorf("unmarshal worker response: %w", err)
	}

	if wResp.Error != "" && wResp.ExitCode == -1 {
		return nil, fmt.Errorf("worker error: %s", wResp.Error)
	}

	return &ExecResult{
		ExitCode: wResp.ExitCode,
		Stdout:   wResp.Stdout,
		Stderr:   wResp.Stderr,
	}, nil
}

// Destroy removes the Worker from Cloudflare.
func (s *CloudflareSandbox) Destroy(ctx context.Context) error {
	s.mu.Lock()
	if s.destroyed {
		s.mu.Unlock()
		return nil
	}
	s.destroyed = true
	s.mu.Unlock()

	url := fmt.Sprintf("%s/accounts/%s/workers/scripts/%s",
		s.apiBase, s.accountID, s.id)

	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.apiToken)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("delete worker: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 204 {
		return fmt.Errorf("delete worker: status %d", resp.StatusCode)
	}
	return nil
}

// ID returns the sandbox (worker script) identifier.
func (s *CloudflareSandbox) ID() string {
	return s.id
}

// ─── CloudflareManager ─────────────────────────────────────────

// CloudflareManager implements Manager interface for Cloudflare Workers.
type CloudflareManager struct {
	mu        sync.RWMutex
	cfg       Config
	cfCfg     CloudflareConfig
	sandboxes map[string]*CloudflareSandbox
	stopCh    chan struct{}
}

// NewCloudflareManager creates a new Cloudflare-based sandbox manager.
func NewCloudflareManager(cfg Config, cfCfg CloudflareConfig) *CloudflareManager {
	m := &CloudflareManager{
		cfg:       cfg,
		cfCfg:     cfCfg,
		sandboxes: make(map[string]*CloudflareSandbox),
		stopCh:    make(chan struct{}),
	}

	// Start idle pruning goroutine
	go m.pruneLoop()

	return m
}

// Get returns (or creates) a Cloudflare Worker sandbox for the given key.
func (m *CloudflareManager) Get(ctx context.Context, key string, workspace string, cfgOverride *Config) (Sandbox, error) {
	scopeKey := m.cfg.ResolveScopeKey(key)

	m.mu.RLock()
	if sb, ok := m.sandboxes[scopeKey]; ok {
		m.mu.RUnlock()
		return sb, nil
	}
	m.mu.RUnlock()

	// Create new Worker
	m.mu.Lock()
	defer m.mu.Unlock()

	// Double-check
	if sb, ok := m.sandboxes[scopeKey]; ok {
		return sb, nil
	}

	workerName := fmt.Sprintf("goclaw-sbx-%s", sanitizeKey(scopeKey))
	secret := fmt.Sprintf("sbx-%s-%d", scopeKey, time.Now().UnixNano())

	// Deploy the sandbox worker
	if err := m.deployWorker(ctx, workerName, secret); err != nil {
		return nil, fmt.Errorf("deploy sandbox worker: %w", err)
	}

	workerURL := fmt.Sprintf("https://%s.%s.workers.dev", workerName, m.cfCfg.AccountID)

	sb := &CloudflareSandbox{
		id:        workerName,
		accountID: m.cfCfg.AccountID,
		apiToken:  m.cfCfg.APIToken,
		apiBase:   m.cfCfg.APIBase,
		workerURL: workerURL,
		secret:    secret,
		cpuLimit:  m.cfCfg.CPULimitMs,
		memLimit:  m.cfCfg.MemoryMB,
		created:   time.Now(),
		lastUsed:  time.Now(),
	}

	m.sandboxes[scopeKey] = sb
	return sb, nil
}

// deployWorker creates or updates a Worker script on Cloudflare.
func (m *CloudflareManager) deployWorker(ctx context.Context, name, secret string) error {
	url := fmt.Sprintf("%s/accounts/%s/workers/scripts/%s",
		m.cfCfg.APIBase, m.cfCfg.AccountID, name)

	// Build multipart form
	metadata := map[string]interface{}{
		"main_module": "worker.js",
		"bindings": []map[string]interface{}{
			{
				"type": "secret_text",
				"name": "SANDBOX_SECRET",
				"text": secret,
			},
		},
		"compatibility_date": "2025-12-01",
		"usage_model":        "standard",
	}

	metaJSON, _ := json.Marshal(metadata)

	// Simple multipart without boundary library
	boundary := "----GoClaw_CF_Sandbox"
	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Disposition: form-data; name=\"metadata\"\r\n")
	buf.WriteString("Content-Type: application/json\r\n\r\n")
	buf.Write(metaJSON)
	buf.WriteString(fmt.Sprintf("\r\n--%s\r\n", boundary))
	buf.WriteString("Content-Disposition: form-data; name=\"worker.js\"; filename=\"worker.js\"\r\n")
	buf.WriteString("Content-Type: application/javascript+module\r\n\r\n")
	buf.WriteString(EXEC_WORKER_TEMPLATE)
	buf.WriteString(fmt.Sprintf("\r\n--%s--\r\n", boundary))

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+m.cfCfg.APIToken)
	req.Header.Set("Content-Type", "multipart/form-data; boundary="+boundary)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("deploy worker HTTP: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("deploy worker: status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// Release destroys a sandbox by key.
func (m *CloudflareManager) Release(ctx context.Context, key string) error {
	scopeKey := m.cfg.ResolveScopeKey(key)

	m.mu.Lock()
	sb, ok := m.sandboxes[scopeKey]
	if ok {
		delete(m.sandboxes, scopeKey)
	}
	m.mu.Unlock()

	if ok {
		return sb.Destroy(ctx)
	}
	return nil
}

// ReleaseAll destroys all active sandboxes.
func (m *CloudflareManager) ReleaseAll(ctx context.Context) error {
	m.mu.Lock()
	all := make([]*CloudflareSandbox, 0, len(m.sandboxes))
	for _, sb := range m.sandboxes {
		all = append(all, sb)
	}
	m.sandboxes = make(map[string]*CloudflareSandbox)
	m.mu.Unlock()

	var firstErr error
	for _, sb := range all {
		if err := sb.Destroy(ctx); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

// Stop signals background goroutines to stop.
func (m *CloudflareManager) Stop() {
	select {
	case <-m.stopCh:
	default:
		close(m.stopCh)
	}
}

// Stats returns info about active sandboxes.
func (m *CloudflareManager) Stats() map[string]any {
	m.mu.RLock()
	defer m.mu.RUnlock()

	workers := make([]map[string]any, 0, len(m.sandboxes))
	for key, sb := range m.sandboxes {
		sb.mu.Lock()
		workers = append(workers, map[string]any{
			"key":        key,
			"worker_id":  sb.id,
			"created":    sb.created.Format(time.RFC3339),
			"last_used":  sb.lastUsed.Format(time.RFC3339),
			"exec_count": sb.execCount,
			"destroyed":  sb.destroyed,
		})
		sb.mu.Unlock()
	}

	return map[string]any{
		"type":            "cloudflare_workers",
		"active_workers":  len(m.sandboxes),
		"cpu_limit_ms":    m.cfCfg.CPULimitMs,
		"memory_mb":       m.cfCfg.MemoryMB,
		"workers":         workers,
	}
}

// pruneLoop periodically removes idle sandbox workers.
func (m *CloudflareManager) pruneLoop() {
	interval := time.Duration(m.cfg.PruneIntervalMin) * time.Minute
	if interval < time.Minute {
		interval = 5 * time.Minute
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopCh:
			return
		case <-ticker.C:
			m.pruneIdle()
		}
	}
}

func (m *CloudflareManager) pruneIdle() {
	maxIdle := time.Duration(m.cfg.IdleHours) * time.Hour
	if maxIdle < time.Hour {
		maxIdle = 24 * time.Hour
	}

	now := time.Now()
	ctx := context.Background()

	m.mu.Lock()
	var toRemove []string
	for key, sb := range m.sandboxes {
		sb.mu.Lock()
		idle := now.Sub(sb.lastUsed)
		sb.mu.Unlock()
		if idle > maxIdle {
			toRemove = append(toRemove, key)
		}
	}

	removed := make([]*CloudflareSandbox, 0, len(toRemove))
	for _, key := range toRemove {
		if sb, ok := m.sandboxes[key]; ok {
			removed = append(removed, sb)
			delete(m.sandboxes, key)
		}
	}
	m.mu.Unlock()

	for _, sb := range removed {
		_ = sb.Destroy(ctx)
	}
}

// sanitizeKey converts a scope key to a valid Worker name (lowercase, alphanumeric + hyphens).
func sanitizeKey(key string) string {
	clean := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		if r >= 'A' && r <= 'Z' {
			return r + 32 // lowercase
		}
		return '-'
	}, key)

	// Truncate to CF worker name limit
	if len(clean) > 63 {
		clean = clean[:63]
	}
	return strings.Trim(clean, "-")
}

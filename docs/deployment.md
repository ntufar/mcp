# Deployment Guide: MCP File Browser Server

This guide explains how to deploy the MCP File Browser Server securely.

## Prerequisites

- Node.js 18+
- System user with limited permissions for the service
- Access to configure system service (systemd on Linux, launchd on macOS)

## Configuration

Create a production configuration JSON (example):

```json
{
  "server": { "name": "mcp-file-browser", "version": "1.0.0" },
  "security": {
    "allowedPaths": ["/srv/mcp/data"],
    "deniedPaths": ["/etc", "/root", "/sys"],
    "maxFileSize": "100MB",
    "maxDirectoryDepth": 8
  },
  "performance": {
    "cacheSize": "200MB",
    "cacheTTL": 600,
    "maxConcurrentOperations": 30
  },
  "logging": { "level": "info", "auditEnabled": true }
}
```

Export the config path:

```bash
export MCP_CONFIG_PATH=/etc/mcp-file-browser/config.json
```

## System Service (Linux systemd)

Create `/etc/systemd/system/mcp-file-browser.service`:

```ini
[Unit]
Description=MCP File Browser Server
After=network.target

[Service]
Type=simple
User=mcp
Group=mcp
Environment=MCP_CONFIG_PATH=/etc/mcp-file-browser/config.json
ExecStart=/usr/bin/node /opt/mcp/dist/server/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mcp-file-browser
sudo systemctl start mcp-file-browser
sudo systemctl status mcp-file-browser
```

## macOS Launchd (Optional)

Create `~/Library/LaunchAgents/com.example.mcp.filebrowser.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.example.mcp.filebrowser</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/Users/you/projects/mcp/dist/server/index.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>MCP_CONFIG_PATH</key><string>/Users/you/mcp-prod/config.json</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/usr/local/var/log/mcp-filebrowser.out.log</string>
  <key>StandardErrorPath</key><string>/usr/local/var/log/mcp-filebrowser.err.log</string>
</dict>
</plist>
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.example.mcp.filebrowser.plist
```

## Security Best Practices

- Run as a dedicated low-privilege user
- Restrict `allowedPaths` to required directories only
- Keep `deniedPaths` for system locations
- Enable audit logging and rotate logs
- Set sensible resource limits

## LLM Integration

- Claude Desktop: see `examples/llm-integration/claude-desktop.md`
- OpenAI GPT-4: see `examples/llm-integration/openai-gpt.md`
- Ollama: see `examples/llm-integration/ollama-local.md`

## Verification

```bash
npm run test
npm run test:integration
npm run example:test
```

## Troubleshooting

- Check service logs for errors
- Verify `MCP_CONFIG_PATH` is readable by the service user
- Ensure allowed paths exist and have correct permissions

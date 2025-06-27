# MCP Configuration for SweetyOnCall (2025 Updated)

This directory contains Model Context Protocol (MCP) server configurations for connecting Claude Code to external services used by the SweetyOnCall application.

**All configurations updated for 2025 with official MCP servers from each service provider.**

## Setup Instructions

### 1. Official MCP Servers (No Installation Required)

The configurations use official MCP servers that are automatically downloaded via `npx`. No pre-installation needed:

- **Supabase**: `@supabase/mcp-server-supabase@latest` (Official)
- **Stripe**: `@stripe/mcp` (Official) 
- **VAPI**: `@vapi-ai/mcp-server` (Official)

### 2. Get API Keys and Credentials

#### Supabase (Updated 2025)
1. Go to your Supabase dashboard: https://supabase.com/dashboard/projects
2. Select your project (emtwxyywgszhboxpaunk)
3. Go to Settings > **Access Tokens** (not API keys)
4. Create a **Personal Access Token** with a descriptive name like "Claude MCP Server"
5. Copy the token (starts with `sbp_`)

**Note**: The 2025 official Supabase MCP server uses Personal Access Tokens instead of API keys for better security.

#### Stripe (Updated 2025)
1. Go to your Stripe dashboard: https://dashboard.stripe.com
2. Go to Developers > API keys
3. Copy your **Secret key** (starts with `sk_`)

**Note**: The 2025 official Stripe MCP server only requires the secret key, passed as a command argument.

#### VAPI (Updated 2025)
1. Go to your VAPI dashboard: https://dashboard.vapi.ai
2. Go to Settings > API Keys
3. Copy your API key

**Alternative**: You can also use the hosted VAPI MCP endpoint at `https://mcp.vapi.ai/sse`

### 3. Update Configuration Files

Replace the placeholder values in `claude-desktop-config.json`:

- **Supabase**: Replace `YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN_HERE` with your Personal Access Token
- **Stripe**: Replace `YOUR_STRIPE_SECRET_KEY_HERE` with your Secret Key  
- **VAPI**: Replace `YOUR_VAPI_API_KEY_HERE` with your API Key

**Security Features (2025)**:
- Supabase MCP runs in `--read-only` mode by default
- Stripe MCP can be limited with `--tools=specific,tools` instead of `--tools=all`
- All servers use latest official packages with enhanced security

### 4. Configure Claude Desktop

Copy the contents of `claude-desktop-config.json` into your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

### 5. Restart Claude Desktop

After updating the configuration, restart Claude Desktop for the changes to take effect.

## What Each Service Provides

### Supabase MCP
- Database schema and table structures
- Row-level security policies
- Edge function configurations
- Real-time subscription settings
- Storage bucket configurations

### Stripe MCP  
- Product and pricing configurations
- Customer data patterns
- Payment method settings
- Webhook endpoint configurations
- Subscription and billing data

### VAPI MCP
- AI agent configurations
- Assistant prompt settings
- Phone number assignments
- Call routing logic
- Webhook integrations

## Security Notes

- Never commit API keys to version control
- Use environment variables in production
- Regularly rotate API keys
- Monitor API usage and set up alerts
- Use least-privilege access (read-only when possible)

## Troubleshooting

If MCP servers don't connect:

1. Check that all API keys are valid
2. Verify internet connectivity
3. Check Claude Desktop logs
4. Ensure MCP packages are installed globally
5. Restart Claude Desktop after config changes
# MCP Server Setup Guide

This document explains the Model Context Protocol (MCP) servers configured for this project.

## Installed MCP Servers

### 1. Supabase MCP Server
**Status:** ✅ Configured (OAuth authentication)
**URL:** https://mcp.supabase.com/mcp
**Purpose:** PostgreSQL database operations

**Features:**
- Database table management
- SQL query execution
- Project configuration access
- Real-time data operations

**Authentication:**
- Uses OAuth with dynamic client registration
- You'll be prompted to authenticate via browser when first using Supabase tools
- No API keys needed in .env (handled automatically)

**Alternative (CI/CD environments):**
If you need token-based auth, add to `.env`:
```bash
SUPABASE_ACCESS_TOKEN=your_token_here
SUPABASE_PROJECT_REF=your_project_ref_here
```

---

### 2. Vercel MCP Server
**Status:** ✅ Configured (OAuth authentication)
**URL:** https://mcp.vercel.com
**Purpose:** Deployment and hosting management

**Features:**
- Deployment management
- Project configuration
- Team management
- Deployment logs retrieval
- Vercel documentation search

**Authentication:**
- Uses OAuth authentication
- You'll be prompted to authenticate when first using Vercel tools
- Connects to your existing Vercel account

**Note:** Currently read-only (Public Beta)

---

### 3. Pinecone Developer MCP Server
**Status:** ✅ Configured (API Key authentication)
**Package:** @pinecone-database/mcp
**Purpose:** Vector database operations

**Features (9 tools):**
- `pinecone_search_docs` - Search Pinecone documentation
- `pinecone_list_indexes` - List all indexes
- `pinecone_describe_index` - Get index details
- `pinecone_create_index` - Create new index
- `pinecone_delete_index` - Delete index
- `pinecone_list_index_vectors` - List vectors in index
- `pinecone_upsert` - Insert/update vectors
- `pinecone_query` - Query vectors with semantic search
- `pinecone_delete_vectors` - Delete vectors

**Authentication:**
Already configured! Your `PINECONE_API_KEY` from `.env` is automatically used.

---

## How to Use MCP Servers

### First Time Setup

1. **Restart Claude Code** to load the new MCP configuration:
   ```bash
   # Exit Claude Code and restart
   claude
   ```

2. **Authenticate Services:**
   - When you first use Supabase or Vercel tools, you'll be prompted to authenticate
   - A browser window will open for OAuth login
   - Follow the prompts to authorize Claude Code

3. **Verify Installation:**
   Check available MCP tools in Claude Code:
   ```
   /mcp
   ```

### Using MCP Tools

Once authenticated, you can ask Claude Code to:

**Supabase examples:**
- "Show me all tables in my Supabase database"
- "Query the users table for recent signups"
- "Create a new table for storing analytics"

**Vercel examples:**
- "Show my recent deployments"
- "Get the deployment logs for project X"
- "Search Vercel docs for Edge Runtime"

**Pinecone examples:**
- "List all my Pinecone indexes"
- "Query the 'jisa-app' index for similar vectors"
- "Show index statistics for namespace 'commission'"
- "Upsert new vectors to my index"

---

## Configuration File Location

The MCP configuration is stored in:
```
/home/bitnami/archive/context-hub/jisa_app/.mcp.json
```

This file is tracked in git and contains no secrets (only references to environment variables).

---

## Troubleshooting

### "MCP server not found"
- Restart Claude Code
- Check that .mcp.json exists in the project root
- Verify the file has valid JSON syntax

### "Authentication failed" (Supabase/Vercel)
- Run `/mcp` in Claude Code to re-authenticate
- Check your browser for OAuth prompts
- Ensure you're logged into the correct account

### "Pinecone API key invalid"
- Verify `PINECONE_API_KEY` in `.env` file
- Get a new key from https://app.pinecone.io
- Restart Claude Code after updating .env

### "npx command not found"
- Ensure Node.js is installed: `node --version`
- Install Node.js if missing: https://nodejs.org

---

## Additional Resources

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Vercel MCP Documentation](https://vercel.com/docs/mcp/vercel-mcp)
- [Pinecone MCP GitHub](https://github.com/pinecone-io/pinecone-mcp)
- [Claude Code MCP Guide](https://docs.anthropic.com/en/docs/claude-code/mcp)

---

## Security Notes

- Never commit `.env` files to git (already in .gitignore)
- OAuth tokens are stored securely by Claude Code
- API keys should be rotated regularly
- Use project-scoped tokens when possible
- MCP servers run locally - your data stays private

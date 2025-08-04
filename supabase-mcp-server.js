#!/usr/bin/env node

/**
 * Custom Supabase MCP Server
 * Works with anon key for read-only database access
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create MCP server
const server = new Server(
  {
    name: 'supabase-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query_database',
        description: 'Execute a read-only SQL query on the Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute (SELECT statements only)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables in the database',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'describe_table',
        description: 'Get the schema/structure of a specific table',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the table to describe',
            },
          },
          required: ['table_name'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'query_database': {
        const { query } = args;
        
        // Basic safety check - only allow SELECT statements
        if (!query.trim().toLowerCase().startsWith('select')) {
          throw new Error('Only SELECT queries are allowed for safety');
        }

        const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
        
        if (error) {
          throw error;
        }

        return {
          content: [
            {
              type: 'text',
              text: `Query executed successfully:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'list_tables': {
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');

        if (error) {
          throw error;
        }

        return {
          content: [
            {
              type: 'text',
              text: `Available tables:\n${data.map(t => `- ${t.table_name}`).join('\n')}`,
            },
          ],
        };
      }

      case 'describe_table': {
        const { table_name } = args;
        
        const { data, error } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', table_name)
          .eq('table_schema', 'public');

        if (error) {
          throw error;
        }

        return {
          content: [
            {
              type: 'text',
              text: `Table "${table_name}" schema:\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Supabase MCP Server running with anon key authentication');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
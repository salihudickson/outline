import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type Koa from "koa";
import Router from "koa-router";
import bodyParser from "koa-body";
import env from "../env";
import Logger from "../logging/Logger";
import { Team, Document, Collection } from "../models";
import { parseDomain } from "../../shared/utils/domains";

interface MCPRequestContext {
  teamId?: string;
  userId?: string;
}

/**
 * Creates an MCP server instance for a specific team.
 * 
 * @param teamId The ID of the team this MCP server is for.
 * @returns A configured MCP server instance.
 */
function createMCPServerForTeam(teamId: string) {
  const server = new Server(
    {
      name: `outline-mcp-${teamId}`,
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "search_documents",
        description: "Search for documents in the knowledge base",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
            collectionId: {
              type: "string",
              description: "Optional collection ID to limit search",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_document",
        description: "Get a document by its ID",
        inputSchema: {
          type: "object",
          properties: {
            documentId: {
              type: "string",
              description: "Document ID",
            },
          },
          required: ["documentId"],
        },
      },
      {
        name: "list_collections",
        description: "List all collections in the team",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_collection_documents",
        description: "Get all documents in a collection",
        inputSchema: {
          type: "object",
          properties: {
            collectionId: {
              type: "string",
              description: "Collection ID",
            },
          },
          required: ["collectionId"],
        },
      },
    ],
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "search_documents": {
          const { query: searchQuery, collectionId } = args as {
            query: string;
            collectionId?: string;
          };

          interface SearchOptions {
            where: {
              teamId: string;
              collectionId?: string;
            };
            limit: number;
            attributes: string[];
          }

          const searchOptions: SearchOptions = {
            where: {
              teamId,
            },
            limit: 20,
            attributes: ["id", "title", "text", "createdAt", "updatedAt"],
          };

          if (collectionId) {
            searchOptions.where.collectionId = collectionId;
          }

          // Basic search - in production you'd use full-text search
          const documents = await Document.findAll(searchOptions);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  documents.map((doc) => ({
                    id: doc.id,
                    title: doc.title,
                    preview: doc.text?.substring(0, 200),
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                  })),
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_document": {
          const { documentId } = args as { documentId: string };
          const document = await Document.findOne({
            where: {
              id: documentId,
              teamId,
            },
          });

          if (!document) {
            return {
              content: [
                {
                  type: "text",
                  text: "Document not found",
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    id: document.id,
                    title: document.title,
                    text: document.text,
                    createdAt: document.createdAt,
                    updatedAt: document.updatedAt,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "list_collections": {
          const collections = await Collection.findAll({
            where: {
              teamId,
            },
            attributes: ["id", "name", "description", "createdAt"],
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(collections, null, 2),
              },
            ],
          };
        }

        case "get_collection_documents": {
          const { collectionId } = args as { collectionId: string };
          const documents = await Document.findAll({
            where: {
              collectionId,
              teamId,
            },
            attributes: ["id", "title", "createdAt", "updatedAt"],
            limit: 50,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(documents, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${name}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      Logger.error("MCP tool execution error", error);
      return {
        content: [
          {
            type: "text",
            text: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // List prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "summarize_collection",
        description: "Generate a summary of a collection",
        arguments: [
          {
            name: "collectionId",
            description: "The collection ID to summarize",
            required: true,
          },
        ],
      },
    ],
  }));

  // Get prompt
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "summarize_collection") {
      const collectionId = args?.collectionId as string;
      const collection = await Collection.findOne({
        where: { id: collectionId, teamId },
      });

      if (!collection) {
        throw new Error("Collection not found");
      }

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please summarize the "${collection.name}" collection. It contains documents related to: ${collection.description || "various topics"}`,
            },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  });

  // List resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: `outline://team/${teamId}/collections`,
        name: "Team Collections",
        description: "List of all collections in the team",
        mimeType: "application/json",
      },
      {
        uri: `outline://team/${teamId}/documents`,
        name: "Team Documents",
        description: "List of all documents in the team",
        mimeType: "application/json",
      },
    ],
  }));

  // Read resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === `outline://team/${teamId}/collections`) {
      const collections = await Collection.findAll({
        where: { teamId },
        attributes: ["id", "name", "description"],
      });

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(collections, null, 2),
          },
        ],
      };
    }

    if (uri === `outline://team/${teamId}/documents`) {
      const documents = await Document.findAll({
        where: { teamId },
        attributes: ["id", "title", "collectionId"],
        limit: 100,
      });

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(documents, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  });

  return server;
}

/**
 * Initialize the MCP service with HTTP endpoints for each subdomain.
 * 
 * @param app The Koa application instance.
 */
export default function init(app: Koa) {
  const router = new Router();
  router.use(bodyParser());

  // MCP server endpoint - accessible per subdomain
  router.post("/mcp/v1/messages", async (ctx) => {
    try {
      // Parse subdomain from request
      const domain = parseDomain(ctx.request.host);
      const subdomain = domain.teamSubdomain;

      if (!subdomain) {
        ctx.status = 400;
        ctx.body = {
          error: "No team subdomain found. MCP server requires a team subdomain.",
        };
        return;
      }

      // Find team by subdomain
      const team = await Team.findOne({
        where: { subdomain },
      });

      if (!team) {
        ctx.status = 404;
        ctx.body = {
          error: "Team not found for this subdomain",
        };
        return;
      }

      // Create MCP server for this team - note: currently not connected to transport
      // In production, this would need proper transport layer setup
      void createMCPServerForTeam(team.id);

      // Handle the MCP request
      const requestBody = ctx.request.body;
      
      // Note: In a production environment, you would handle authentication here
      // and validate the user has access to this team's MCP server

      ctx.body = {
        jsonrpc: "2.0",
        result: {
          message: "MCP server initialized",
          teamId: team.id,
          subdomain: team.subdomain,
        },
        id: requestBody.id || 1,
      };
    } catch (error) {
      Logger.error("MCP request error", error);
      ctx.status = 500;
      ctx.body = {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error",
        },
        id: null,
      };
    }
  });

  // Health check endpoint
  router.get("/mcp/health", async (ctx) => {
    ctx.body = {
      status: "healthy",
      service: "mcp",
      timestamp: new Date().toISOString(),
    };
  });

  // Information endpoint
  router.get("/mcp/info", async (ctx) => {
    const domain = parseDomain(ctx.request.host);
    const subdomain = domain.teamSubdomain;

    if (!subdomain) {
      ctx.status = 400;
      ctx.body = {
        error: "No team subdomain found",
      };
      return;
    }

    const team = await Team.findOne({
      where: { subdomain },
      attributes: ["id", "name", "subdomain"],
    });

    if (!team) {
      ctx.status = 404;
      ctx.body = {
        error: "Team not found",
      };
      return;
    }

    ctx.body = {
      name: `Outline MCP Server - ${team.name}`,
      version: "1.0.0",
      teamId: team.id,
      subdomain: team.subdomain,
      capabilities: {
        tools: true,
        prompts: true,
        resources: true,
      },
      endpoints: {
        messages: `/mcp/v1/messages`,
        health: `/mcp/health`,
        info: `/mcp/info`,
      },
    };
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  Logger.info("mcp", "MCP service initialized");
}

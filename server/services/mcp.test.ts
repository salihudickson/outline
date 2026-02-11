import { buildTeam, buildUser, buildDocument, buildCollection } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import mcpService from "@server/services/mcp";
import webService from "@server/services/web";
import onerror from "@server/onerror";
import TestServer from "@server/test/TestServer";
import { sequelize } from "@server/storage/database";

// Create a test server with both web and MCP services
function getMCPTestServer() {
  const app = webService();
  mcpService(app);
  onerror(app);
  const server = new TestServer(app);

  const disconnect = async () => {
    await sequelize.close();
    return server.close();
  };

  afterAll(disconnect);

  return server;
}

const server = getMCPTestServer();

describe("MCP Service", () => {
  describe("/mcp/health", () => {
    it("should return health status", async () => {
      const team = await buildTeam();
      const res = await server.get("/mcp/health", {
        headers: {
          host: `${team.subdomain}.example.com`,
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.status).toEqual("healthy");
      expect(body.service).toEqual("mcp");
    });
  });

  describe("/mcp/info", () => {
    it("should return MCP server info for valid subdomain", async () => {
      const team = await buildTeam();
      const res = await server.get("/mcp/info", {
        headers: {
          host: `${team.subdomain}.example.com`,
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.name).toContain(team.name);
      expect(body.teamId).toEqual(team.id);
      expect(body.subdomain).toEqual(team.subdomain);
      expect(body.capabilities).toBeDefined();
      expect(body.capabilities.tools).toEqual(true);
      expect(body.capabilities.prompts).toEqual(true);
      expect(body.capabilities.resources).toEqual(true);
    });

    it("should return 400 for missing subdomain", async () => {
      const res = await server.get("/mcp/info", {
        headers: {
          host: "example.com",
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(400);
      expect(body.error).toContain("No team subdomain found");
    });

    it("should return 404 for non-existent team", async () => {
      const res = await server.get("/mcp/info", {
        headers: {
          host: "nonexistent.example.com",
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(404);
      expect(body.error).toContain("Team not found");
    });
  });

  describe("/mcp/v1/messages", () => {
    it("should return MCP server info for valid subdomain", async () => {
      const team = await buildTeam();
      const res = await server.post("/mcp/v1/messages", {
        headers: {
          host: `${team.subdomain}.example.com`,
        },
        body: {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.jsonrpc).toEqual("2.0");
      expect(body.result.teamId).toEqual(team.id);
      expect(body.result.subdomain).toEqual(team.subdomain);
    });

    it("should return 400 for missing subdomain", async () => {
      const res = await server.post("/mcp/v1/messages", {
        headers: {
          host: "example.com",
        },
        body: {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(400);
      expect(body.error).toContain("No team subdomain found");
    });

    it("should return 404 for non-existent team", async () => {
      const res = await server.post("/mcp/v1/messages", {
        headers: {
          host: "nonexistent.example.com",
        },
        body: {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        },
      });
      const body = await res.json();
      expect(res.status).toEqual(404);
      expect(body.error).toContain("Team not found");
    });
  });

  describe("Subdomain Isolation", () => {
    it("should isolate MCP servers per subdomain", async () => {
      const team1 = await buildTeam();
      const team2 = await buildTeam();

      const res1 = await server.get("/mcp/info", {
        headers: {
          host: `${team1.subdomain}.example.com`,
        },
      });
      const body1 = await res1.json();

      const res2 = await server.get("/mcp/info", {
        headers: {
          host: `${team2.subdomain}.example.com`,
        },
      });
      const body2 = await res2.json();

      expect(body1.teamId).toEqual(team1.id);
      expect(body2.teamId).toEqual(team2.id);
      expect(body1.teamId).not.toEqual(body2.teamId);
    });
  });
});

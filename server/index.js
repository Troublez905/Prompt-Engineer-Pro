import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  buildPromptWorkspaceResult,
  DEFAULT_FORM,
  getModelOptions,
  getPromptTypeOptions,
  normalizePromptConfig,
} from "../shared/promptEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetHtml = readFileSync(path.join(__dirname, "static", "widget.html"), "utf8");
const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";
const widgetUri = "ui://widget/prompt-engineer.html";

const promptTypeValues = getPromptTypeOptions().map((option) => option.value);
const modelValues = getModelOptions().map((option) => option.value);

function createToolText(result) {
  if (!result.variants.length) {
    return "Opened Prompt Engineer Pro. Add your idea in the widget to generate prompt options.";
  }

  return `Generated ${result.variants.length} ${result.summary.promptTypeLabel.toLowerCase()} options for ${result.summary.targetModelLabel}.`;
}

function createAppServer() {
  const server = new McpServer({
    name: "prompt-engineer-pro",
    version: "0.2.0",
  });

  registerAppResource(
    server,
    "prompt-engineer-widget",
    widgetUri,
    {},
    async () => ({
      contents: [
        {
          uri: widgetUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: {
              prefersBorder: true,
              csp: {
                connectDomains: [],
                resourceDomains: [],
              },
            },
            "openai/widgetDescription":
              "Interactive workspace for turning rough ideas into stronger prompt variants and rewrites.",
            "openai/widgetPrefersBorder": true,
          },
        },
      ],
    }),
  );

  registerAppTool(
    server,
    "open_prompt_workspace",
    {
      title: "Open prompt workspace",
      description:
        "Use this when the user wants to open the interactive prompt engineering workspace before generating or refining prompts.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        ui: {
          resourceUri: widgetUri,
          visibility: ["model"],
        },
        "openai/outputTemplate": widgetUri,
        "openai/toolInvocation/invoking": "Opening workspace...",
        "openai/toolInvocation/invoked": "Workspace ready",
      },
    },
    async () => {
      const result = buildPromptWorkspaceResult(DEFAULT_FORM);
      return {
        content: [{ type: "text", text: createToolText(result) }],
        structuredContent: result,
      };
    },
  );

  registerAppTool(
    server,
    "generate_prompts",
    {
      title: "Generate prompt options",
      description:
        "Use this when the user wants to turn a rough idea into multiple stronger prompts tailored to a prompt type, target GPT style, and output count.",
      inputSchema: {
        promptType: z.enum(promptTypeValues).optional(),
        targetModel: z.enum(modelValues).optional(),
        optionCount: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(10)]).optional(),
        searchDepth: z.number().int().min(1).max(10).optional(),
        iterations: z.number().int().min(1).max(5).optional(),
        idea: z.string().optional(),
        constraints: z.string().optional(),
        references: z.string().optional(),
        rewriteBase: z
          .object({
            title: z.string().optional(),
            text: z.string().optional(),
          })
          .optional(),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        ui: {
          resourceUri: widgetUri,
          visibility: ["model", "app"],
        },
        "openai/outputTemplate": widgetUri,
        "openai/toolInvocation/invoking": "Generating prompts...",
        "openai/toolInvocation/invoked": "Prompts ready",
      },
    },
    async (args) => {
      const result = buildPromptWorkspaceResult(normalizePromptConfig(args));
      return {
        content: [{ type: "text", text: createToolText(result) }],
        structuredContent: result,
      };
    },
  );

  return server;
}

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Prompt Engineer Pro MCP server running at ${MCP_PATH}`);
    return;
  }

  const mcpMethods = new Set(["POST", "GET", "DELETE"]);
  if (url.pathname === MCP_PATH && req.method && mcpMethods.has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createAppServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Prompt Engineer Pro MCP server listening on http://localhost:${port}${MCP_PATH}`);
});

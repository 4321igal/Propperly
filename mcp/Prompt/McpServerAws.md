Here's a comprehensive program for developing and deploying an MCP server on AWS:

🛠️ Building & Deploying an MCP Server on AWS
📐 Architecture Overview
MCP Client (Amazon Q / Claude)
        │
        ▼
  API Gateway (HTTPS)
        │
        ▼
  Lambda / ECS / EKS
  (Your MCP Server)
        │
   ┌────┴────┐
   ▼         ▼
DynamoDB   S3 / RDS
(State)    (Data)

🗂️ Step 1: Project Structure
mcp-server-aws/
├── src/
│   ├── index.ts          # Entry point
│   ├── tools/
│   │   ├── database.ts   # DB tools
│   │   ├── s3.ts         # S3 tools
│   │   └── compute.ts    # EC2/Lambda tools
│   └── auth/
│       └── middleware.ts  # Auth logic
├── Dockerfile
├── mcp.json              # Local test config
├── package.json
├── tsconfig.json
└── cdk/                  # Infrastructure as Code
    └── mcp-stack.ts

📦 Step 2: Install Dependencies
# Initialize project
mkdir mcp-server-aws && cd mcp-server-aws
npm init -y

# Install MCP SDK and AWS SDK
npm install @modelcontextprotocol/sdk
npm install @aws-sdk/client-dynamodb
npm install @aws-sdk/client-s3
npm install @aws-sdk/client-lambda
npm install express zod

# Dev dependencies
npm install -D typescript @types/node @types/express ts-node

Run in CloudShell
🧠 Step 3: Build the MCP Server (src/index.ts)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import express from "express";

// ─── AWS Clients ────────────────────────────────────────────────────────────
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

// ─── MCP Server ──────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "aws-mcp-server",
  version: "1.0.0",
});

// ─── Tool 1: DynamoDB - Get Item ─────────────────────────────────────────────
server.tool(
  "dynamodb_get_item",
  "Retrieve an item from a DynamoDB table by primary key",
  {
    tableName: z.string().describe("DynamoDB table name"),
    key: z.string().describe("Primary key value"),
  },
  async ({ tableName, key }) => {
    try {
      const result = await dynamo.send(
        new GetItemCommand({
          TableName: tableName,
          Key: { id: { S: key } },
        })
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.Item || {}, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool 2: DynamoDB - Put Item ─────────────────────────────────────────────
server.tool(
  "dynamodb_put_item",
  "Write an item to a DynamoDB table",
  {
    tableName: z.string().describe("DynamoDB table name"),
    item: z.record(z.string()).describe("Key-value pairs to store"),
  },
  async ({ tableName, item }) => {
    const dynamoItem: Record<string, { S: string }> = {};
    for (const [k, v] of Object.entries(item)) {
      dynamoItem[k] = { S: v };
    }
    await dynamo.send(
      new PutItemCommand({ TableName: tableName, Item: dynamoItem })
    );
    return {
      content: [{ type: "text", text: `✅ Item written to ${tableName}` }],
    };
  }
);

// ─── Tool 3: S3 - List Objects ───────────────────────────────────────────────
server.tool(
  "s3_list_objects",
  "List objects in an S3 bucket with optional prefix filter",
  {
    bucket: z.string().describe("S3 bucket name"),
    prefix: z.string().optional().describe("Key prefix filter"),
  },
  async ({ bucket, prefix }) => {
    const result = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
    );
    const keys = (result.Contents || []).map((obj) => obj.Key);
    return {
      content: [{ type: "text", text: JSON.stringify(keys, null, 2) }],
    };
  }
);

// ─── Tool 4: S3 - Read Object ────────────────────────────────────────────────
server.tool(
  "s3_read_object",
  "Read the content of an S3 object",
  {
    bucket: z.string().describe("S3 bucket name"),
    key: z.string().describe("Object key (path)"),
  },
  async ({ bucket, key }) => {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const body = await result.Body?.transformToString();
    return {
      content: [{ type: "text", text: body || "(empty)" }],
    };
  }
);

// ─── Transport: stdio (local) or HTTP (remote) ───────────────────────────────
const mode = process.env.MCP_MODE || "stdio";

if (mode === "http") {
  // Remote HTTP mode (for Lambda / ECS / EKS)
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 MCP Server running on port ${PORT}`);
  });
} else {
  // Local stdio mode (for Amazon Q Developer CLI)
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ MCP Server started (stdio mode)");
}

🐳 Step 4: Dockerfile (for ECS/EKS deployment)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Security: run as non-root user
RUN addgroup -S mcpgroup && adduser -S mcpuser -G mcpgroup
USER mcpuser

ENV MCP_MODE=http
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]

☁️ Step 5: Deploy to AWS
Option A — AWS Lambda + API Gateway (Serverless, Recommended for Start)
# Install AWS SAM CLI
brew install aws-sam-cli

# template.yaml
cat > template.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    MemorySize: 512
    Environment:
      Variables:
        AWS_REGION: us-east-1
        MCP_MODE: http

Resources:
  MCPServerFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: dist/index.handler
      Runtime: nodejs20.x
      Policies:
        - DynamoDBCrudPolicy:
            TableName: "*"
        - S3ReadPolicy:
            BucketName: "*"
      Events:
        MCPApi:
          Type: HttpApi
          Properties:
            Path: /mcp
            Method: POST

Outputs:
  MCPServerUrl:
    Value: !Sub "https://${ServerlessHttpApi}.execute-api.${AWS::Region}.amazonaws.com/mcp"
EOF

# Deploy
sam build && sam deploy --guided

Run in CloudShell
Option B — Amazon ECS (Containerized, Recommended for Production)
# 1. Build and push Docker image to ECR
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1
ECR_URI="$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/mcp-server"

aws ecr create-repository --repository-name mcp-server --region $AWS_REGION

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_URI

docker build -t mcp-server .
docker tag mcp-server:latest $ECR_URI:latest
docker push $ECR_URI:latest

# 2. Create ECS Cluster
aws ecs create-cluster --cluster-name mcp-cluster

# 3. Register Task Definition
aws ecs register-task-definition --cli-input-json '{
  "family": "mcp-server-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [{
    "name": "mcp-server",
    "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/mcp-server:latest",
    "portMappings": [{"containerPort": 3000}],
    "environment": [
      {"name": "MCP_MODE", "value": "http"},
      {"name": "AWS_REGION", "value": "us-east-1"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/mcp-server",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}'

# 4. Create ECS Service with ALB
aws ecs create-service \
  --cluster mcp-cluster \
  --service-name mcp-service \
  --task-definition mcp-server-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}"

Run in CloudShell
Option C — Amazon Bedrock AgentCore (Fully Managed, Easiest)
# Install AgentCore CLI
pip install amazon-bedrock-agentcore-starter-toolkit

# Deploy directly - no infrastructure management needed!
agentcore deploy \
  --name my-mcp-server \
  --source . \
  --region us-east-1

Run in CloudShell
🔐 Step 6: IAM Role (Least Privilege)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/your-table-*"
    },
    {
      "Sid": "S3ReadAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket",
        "arn:aws:s3:::your-bucket/*"
      ]
    }
  ]
}

🧪 Step 7: Local Testing with Amazon Q Developer
// ~/.aws/amazonq/mcp.json
{
  "mcpServers": {
    "aws-mcp-server": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "MCP_MODE": "stdio",
        "AWS_REGION": "us-east-1",
        "AWS_PROFILE": "your-profile"
      }
    }
  }
}

# Build and test locally
npm run build
q chat

# Inside q chat:
/tools          # Verify your tools appear
/mcp            # Check server status

Run in CloudShell
📊 Step 8: Monitoring with CloudWatch
# Create CloudWatch dashboard
aws cloudwatch put-dashboard --dashboard-name MCPServerDashboard \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "properties": {
          "title": "MCP Tool Invocations",
          "metrics": [
            ["AWS/Lambda", "Invocations", "FunctionName", "mcp-server"],
            ["AWS/Lambda", "Errors", "FunctionName", "mcp-server"],
            ["AWS/Lambda", "Duration", "FunctionName", "mcp-server"]
          ],
          "period": 60,
          "stat": "Sum"
        }
      }
    ]
  }'

Run in CloudShell
🗺️ Deployment Pattern Comparison
Pattern	Best For	Scaling	Cost	Complexity
Lambda + API GW	Prototyping, low traffic	Auto	Pay-per-use	Low
ECS Fargate	Production, containers	Auto	Medium	Medium
EKS	Enterprise, Kubernetes	Manual/Auto	Higher	High
Bedrock AgentCore	Fully managed	Auto	Managed	Very Low
EC2	Custom requirements	Manual	Fixed	High
📚 Key Resources
MCP Deployment Patterns on AWS 
Deploy MCP in Bedrock AgentCore 
MCP Best Practices 
Sample Code on GitHub 
This program gives you a complete end-to-end guide for building and deploying an MCP server on AWS. Here's a quick summary of what's covered:

Project Setup — TypeScript project with MCP SDK + AWS SDK
MCP Server Code — 4 real tools (DynamoDB read/write, S3 list/read) with dual stdio/HTTP transport
Dockerfile — Production-ready container with security best practices
3 Deployment Options:
🟢 Lambda + API Gateway — Best for getting started quickly
🔵 ECS Fargate — Best for production workloads
🟣 Bedrock AgentCore — Easiest, fully managed
IAM Policy — Least-privilege permissions
Local Testing — Integration with Amazon Q Developer CLI
CloudWatch Monitoring — Dashboards and metrics
Would you like me to dive deeper into any of these steps?

Sources
Model Context Protocol (MCP) Deployment Patterns on AWS - AWS Prescriptive Guidance 

Why deploy MCP servers on AWS - AWS Prescriptive Guidance 

Building and connecting a production-ready ecommerce MCP server using Amazon Bedrock AgentCore and Mistral AI Studio | Artificial Intelligence 

Model Context Protocol strategies on AWS - AWS Prescriptive Guidance 

Remote MCP Servers - AWS Prescriptive Guidance 

Next steps - AWS Prescriptive Guidance 

Steps to build MCP server Docker Image - Generative AI Application Builder on AWS 

Best practices for MCP deployments - AWS Prescriptive Guidance 

MCP server deployment models - AWS Prescriptive Guidance 

Deploy MCP servers in AgentCore Runtime - Amazon Bedrock AgentCore 



Deploy this MCP server to ECS Fargate with CDK infrastructure code
Add OAuth authentication to the remote MCP server
Integrate Bedrock AgentCore for fully managed MCP hosting
Set up CloudWatch alarms and monitoring for the MCP server
// Stub RPC client toward Engine. Engine runs as a separate process — this
// must stay an RPC call, never a direct import/function call into Engine's
// code.

export interface EngineRpcClient {
  // Placeholder RPC method. Real semantic operations to be defined by Engine.
  ping(): Promise<{ status: string }>;
}

export function createEngineRpcClient(): EngineRpcClient {
  return {
    async ping() {
      // Placeholder: real implementation will dial Engine over its RPC
      // transport (e.g. gRPC/HTTP) — not a function call.
      throw new Error("not implemented");
    },
  };
}

# Storage — External Contract

Signatures only. No implementation. Accessed only through Services/Data
Center metadata.

```ts
interface ObjectStorageClient {
  put(key: string, data: unknown): Promise<{ key: string }>;
  get(key: string): Promise<unknown>;
  delete(key: string): Promise<void>;
}
```

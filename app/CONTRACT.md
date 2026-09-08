# APP — External Contract

Signatures only. No implementation.

## Exposed to WEB (REST/GraphQL)

```ts
interface AppApi {
  // Placeholder use-case entry point, mirrors web/src/contract.ts. Real
  // use-cases to be defined once WEB's actual screens/flows are known.
  ping(): Promise<{ status: string }>;
}
```

## Consumed from Services (REST/GraphQL)

See [`src/contract.ts`](src/contract.ts) for the stub client shape APP uses
to call Services.

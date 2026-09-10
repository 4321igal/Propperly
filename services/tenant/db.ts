import { prisma } from '../db/client.js';

export interface Tenant {
  id: string;
  name: string;
  domain: string | null;
}

export async function findOrCreateTenant(name: string, domain?: string): Promise<Tenant> {
  if (domain) {
    const existing = await prisma.tenant.findUnique({ where: { domain } });
    if (existing) return existing;
  }
  return prisma.tenant.create({
    data: { name, domain: domain ?? null },
    select: { id: true, name: true, domain: true },
  });
}

export async function findTenantByDomain(domain: string): Promise<Tenant | null> {
  return prisma.tenant.findUnique({
    where: { domain },
    select: { id: true, name: true, domain: true },
  });
}

export async function findTenantById(id: string): Promise<Tenant | null> {
  return prisma.tenant.findUnique({
    where: { id },
    select: { id: true, name: true, domain: true },
  });
}

// Returns the tenant ID for the current deployment.
// In single-tenant mode, reads SINGLE_TENANT_ID from env.
// In multi-tenant mode, tenantId is embedded in the JWT and passed directly.
export function resolveTenantId(jwtTenantId?: string): string | undefined {
  return jwtTenantId ?? process.env.SINGLE_TENANT_ID;
}

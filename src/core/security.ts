export interface Identity { subject: string; tenantId: string; roles: string[]; }

export function canAccessCase(identity: Identity, caseTenantId: string): boolean {
  return identity.tenantId === caseTenantId && identity.roles.length > 0;
}

export function requireRole(identity: Identity, role: string): void {
  if (!identity.roles.includes(role)) throw new Error(`Missing required role: ${role}`);
}

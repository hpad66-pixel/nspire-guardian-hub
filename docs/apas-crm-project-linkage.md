# APAS CRM project-party linkage

## Purpose

APAS CRM can assign one of its canonical companies to a Proj OS project as a client, owner, vendor, subcontractor, consultant, property manager, inspector, regulator, utility, or other project party. Proj OS owns that assignment; APAS CRM continues to own the company identity.

```text
APAS CRM company ID + project role
       │
       │ 60-second signed service assertion
       ▼
apas-crm-project-links Edge Function
       │
       ├─ verifies client, issuer, audience, contract, organization, workspace, scope
       ├─ verifies the project belongs to the configured workspace
       ├─ applies an idempotent upsert or archive
       └─ records immutable mutation and audit evidence
```

There is no cross-product database connection, shared Supabase service role, or browser-held integration secret.

## Routes

All routes use contract `crm-integration.v1` and are mounted under the `apas-crm-project-links` Edge Function.

| Method | Route | Scope | Result |
|---|---|---|---|
| `GET` | `/v1/integrations/apas-crm/projects` | `projects.read` | At most 500 non-deleted projects in the configured workspace. |
| `GET` | `/v1/integrations/apas-crm/projects/:projectId/parties` | `projects.read` | Active and archived APAS CRM project parties. |
| `POST` | `/v1/integrations/apas-crm/projects/:projectId/parties` | `project_parties.write` | Creates, reactivates, or updates a company/contact assignment. |
| `POST` | `/v1/integrations/apas-crm/projects/:projectId/parties/:partyId/archive` | `project_parties.write` | Archives an assignment without deleting evidence. |

Mutation requests require `idempotency-key`; every request requires `x-correlation-id` and `x-apas-contract-version: crm-integration.v1`.

## Authority and persistence

- `apas_crm_project_parties` is the current Proj OS project relationship.
- `apas_crm_project_party_mutations` prevents replay and binds each idempotency key to a canonical request hash.
- `apas_crm_project_party_audit` is append-only evidence of link, role update, and archive events.
- Signed-in Proj OS project members may read the safe project-party display surface through RLS. Only the service-role RPC can mutate it.
- A company can have one durable assignment per project; changing its role updates that assignment. Archive is reversible through a later upsert.

## Required Edge secrets

```text
APAS_CRM_PROJECT_LINK_CLIENT_ID
APAS_CRM_PROJECT_LINK_CLIENT_SECRET
APAS_CRM_PROJECT_LINK_ISSUER=apas-crm
APAS_CRM_PROJECT_LINK_AUDIENCE=proj-os
APAS_CRM_ORGANIZATION_ID
APAS_CRM_WORKSPACE_ID
```

The client ID and secret must match the APAS CRM server configuration. The organization and workspace are pinned server-side so caller input cannot select another tenant.

## Verification

`supabase/tests/apas_crm_project_party_links.test.sql` covers creation, replay, role propagation, archive, uniqueness, attribution, and immutable evidence. The APAS CRM repository contains the complementary adapter and API integration tests.

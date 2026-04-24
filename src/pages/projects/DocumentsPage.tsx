/**
 * B5 · DocumentsPage — project-scoped document library.
 *
 * This file exists at the path the B5 prompt specifies. The existing
 * page component lives at `ProjectDocumentsPage.tsx` to avoid colliding
 * with the repo's property-management `DocumentsPage` at `/documents`.
 * This is a thin re-export so imports from `@/pages/projects/DocumentsPage`
 * resolve correctly.
 */
export { default } from "./ProjectDocumentsPage";

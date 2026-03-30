// IMPORTANT:
// This project historically had two different api modules:
// - `src/services/api.js` (full-featured, used by the React app)
// - `services/api.js` (older/partial)
//
// To avoid runtime mismatches like `api.createOrganization is not a function`,
// keep this file as a thin re-export of the canonical module.
export * from '../src/services/api';
export { api, getAuthHeaders } from '../src/services/api';
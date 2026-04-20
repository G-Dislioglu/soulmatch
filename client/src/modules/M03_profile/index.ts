/** PURPOSE: Benutzer-Stammdaten (Geburt, Ort, Zeit) fuer astrologische und numerologische Berechnungen */

// Public API for module M03. No deep imports allowed outside this module.
export { ProfileForm } from './ui/ProfileForm';
export { ProfileSummary } from './ui/ProfileSummary';
export {
  loadProfile,
  saveProfile,
  clearProfile,
  hasValidProfile,
  listProfiles,
  getProfileById,
  setCurrentProfileId,
  getCurrentProfile,
  getCurrentProfileId,
  deleteProfile,
} from './lib/profileStorage';

// Image Gallery (MBM-294) business-type allowlist.
// Opened to clothing (2026-09-06), then grocery + hardware (2026-09-08) once
// clothing had validated the pool concept — Vehicle_Services planned next.
// Backend (CategoryReferenceImages, the pool routes, both upload modals) was
// always generic on businessType; this allowlist is the only gate, used by
// both the sidebar link and the gallery page's own business picker.
export const GALLERY_ENABLED_BUSINESS_TYPES = ['clothing', 'grocery', 'hardware']

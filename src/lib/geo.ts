import type { User } from "@/generated/prisma/client";

export const DEFAULT_RADIUS_KM = 50;

export type Origin = { lat: number; lng: number };

export function getRequestOrigin(url: URL, currentUser: User | null): Origin | null {
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  if (latParam && lngParam) {
    const lat = Number(latParam);
    const lng = Number(lngParam);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  if (currentUser?.latitude != null && currentUser?.longitude != null) {
    return { lat: currentUser.latitude, lng: currentUser.longitude };
  }

  return null;
}

export function getRadiusKm(url: URL): number {
  const radiusParam = url.searchParams.get("radius");
  const radius = radiusParam ? Number(radiusParam) : DEFAULT_RADIUS_KM;
  if (!Number.isFinite(radius) || radius <= 0) return DEFAULT_RADIUS_KM;
  return Math.min(radius, 500);
}

import "leaflet/dist/leaflet.css";

import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { cn } from "@/lib/utils";

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildDirectionsUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

import ErrorBoundary from "./ErrorBoundary";

function StoreMapInner({
  latitude,
  longitude,
  title = "Localizacao",
  subtitle,
  className,
}: {
  latitude?: string | number | null;
  longitude?: string | number | null;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (lat === null || lng === null) {
    return (
      <div className={cn("rounded-2xl border border-gray-200 bg-gray-50 p-4", className)}>
        <div className="mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-red-500" />
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        </div>
        <p className="text-sm text-gray-500">
          A localizacao detalhada nao esta disponivel no momento. Confirme o endereco diretamente com a loja.
        </p>
      </div>
    );
  }

  const directionsUrl = buildDirectionsUrl(lat, lng);

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-gray-200 bg-white", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 flex-shrink-0 text-red-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            {subtitle ? <p className="truncate text-xs text-gray-500">{subtitle}</p> : null}
          </div>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
        >
          <Navigation className="h-3.5 w-3.5" />
          Rota
        </a>
      </div>

      <div className="aspect-[16/10] bg-gray-100">
        <MapContainer
          center={[lat, lng]}
          zoom={16}
          scrollWheelZoom
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CircleMarker
            center={[lat, lng]}
            pathOptions={{
              color: "#dc2626",
              fillColor: "#ef4444",
              fillOpacity: 0.35,
              weight: 2,
            }}
            radius={12}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{title}</p>
                {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
              </div>
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
        <p className="text-xs text-gray-500">Mapa interativo baseado em OpenStreetMap.</p>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
      </div>
    </div>
  );
}

export function StoreMap(props: React.ComponentProps<typeof StoreMapInner>) {
  return (
    <ErrorBoundary>
      <StoreMapInner {...props} />
    </ErrorBoundary>
  );
}

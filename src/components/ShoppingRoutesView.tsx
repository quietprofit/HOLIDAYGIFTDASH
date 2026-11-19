/// <reference types="google.maps" />
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Compass,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Navigation,
  Route as RouteIcon,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { GiftItem } from '../types/holiday';
import { updateGiftRouting, updateGiftStatus } from '../lib/holidayService';
import { BlushPinkTreeIcon, GirlyGingerbreadCookieIcon } from './HolidayVisualElements';

interface ShoppingRoutesViewProps {
  uid: string;
  gifts: GiftItem[];
  onBackToCommandCenter?: () => void;
}

interface StoreStopGroup {
  storeName: string;
  stopOrder: number;
  items: GiftItem[];
  subtotal: number;
}

interface ResolvedStop {
  stopIndex: number;
  storeName: string;
  displayName: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  items: GiftItem[];
  subtotal: number;
}

interface RouteSummary {
  distanceText: string;
  durationText: string;
}

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 41.8781, lng: -87.6298 };

function isQuotaError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? `${err.message} ${String((err as { status?: unknown }).status ?? '')}`
      : String(err);
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('429')
  );
}

function toLatLngLiteral(
  loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined
): google.maps.LatLngLiteral | null {
  if (!loc) return null;
  if (typeof (loc as google.maps.LatLng).lat === 'function') {
    const ll = loc as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  const lit = loc as google.maps.LatLngLiteral;
  if (typeof lit.lat === 'number' && typeof lit.lng === 'number') {
    return { lat: lit.lat, lng: lit.lng };
  }
  return null;
}

interface RouteMapCanvasProps {
  storeStops: StoreStopGroup[];
  areaQuery: string;
  userOrigin: google.maps.LatLngLiteral | null;
  plotNonce: number;
  onRouteSummary: (summary: RouteSummary | null) => void;
  onMapStatus: (status: { loading: boolean; error: string | null }) => void;
}

const RouteMapCanvas: React.FC<RouteMapCanvasProps> = ({
  storeStops,
  areaQuery,
  userOrigin,
  plotNonce,
  onRouteSummary,
  onMapStatus,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const coreLib = useMapsLibrary('core');

  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [resolvedStops, setResolvedStops] = useState<ResolvedStop[]>([]);
  const [originCenter, setOriginCenter] = useState<google.maps.LatLngLiteral | null>(userOrigin);
  const [selectedStop, setSelectedStop] = useState<ResolvedStop | null>(null);

  useEffect(() => {
    if (!map || !placesLib || !routesLib || !coreLib) return;
    let cancelled = false;

    const clearPolylines = () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };

    const computeStopsAndRoute = async () => {
      clearPolylines();
      setSelectedStop(null);

      if (storeStops.length === 0) {
        setResolvedStops([]);
        onRouteSummary(null);
        onMapStatus({ loading: false, error: null });
        return;
      }

      onMapStatus({ loading: true, error: null });

      try {
        let startCoords: google.maps.LatLngLiteral | null = userOrigin;
        const cleanArea = areaQuery.trim();
        if (!startCoords && cleanArea) {
          const areaRes = await placesLib.Place.searchByText({
            textQuery: cleanArea,
            fields: ['displayName', 'location'],
            maxResultCount: 1,
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          } as google.maps.places.SearchByTextRequest);
          const areaPlace = areaRes.places?.[0];
          startCoords = toLatLngLiteral(areaPlace?.location);
        }

        if (cancelled) return;
        setOriginCenter(startCoords);

        const resolved: ResolvedStop[] = [];
        for (let i = 0; i < storeStops.length; i++) {
          const stop = storeStops[i];
          const queryText = cleanArea ? `${stop.storeName} near ${cleanArea}` : stop.storeName;
          const searchReq: Record<string, unknown> = {
            textQuery: queryText,
            fields: ['displayName', 'location', 'formattedAddress'],
            maxResultCount: 1,
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          };
          if (startCoords) {
            searchReq.locationBias = startCoords;
          }

          const { places } = await placesLib.Place.searchByText(
            searchReq as unknown as google.maps.places.SearchByTextRequest
          );
          const match = places?.[0];
          const coords = toLatLngLiteral(match?.location);
          if (coords) {
            resolved.push({
              stopIndex: i + 1,
              storeName: stop.storeName,
              displayName: match?.displayName || stop.storeName,
              formattedAddress: match?.formattedAddress || cleanArea || 'Local store',
              location: coords,
              items: stop.items,
              subtotal: stop.subtotal,
            });
          }
        }

        if (cancelled) return;
        setResolvedStops(resolved);

        if (resolved.length === 0) {
          onRouteSummary(null);
          onMapStatus({
            loading: false,
            error: 'No matching store locations were found for that city or ZIP. Try a broader city name.',
          });
          return;
        }

        const bounds = new coreLib.LatLngBounds();
        if (startCoords) bounds.extend(startCoords);
        resolved.forEach((s) => bounds.extend(s.location));

        const routeOrigin = startCoords ?? resolved[0].location;
        const routeDest = resolved[resolved.length - 1].location;
        const intermediates = startCoords
          ? resolved.slice(0, -1).map((s) => ({ location: s.location }))
          : resolved.slice(1, -1).map((s) => ({ location: s.location }));

        const hasDistinctLeg =
          (startCoords && resolved.length >= 1) || (!startCoords && resolved.length >= 2);

        if (hasDistinctLeg) {
          const routeService = routesLib.Route as unknown as {
            computeRoutes: (req: Record<string, unknown>) => Promise<{ routes?: any[] }>;
          };

          const { routes } = await routeService.computeRoutes({
            origin: routeOrigin,
            destination: routeDest,
            ...(intermediates.length > 0 ? { intermediates } : {}),
            travelMode: 'DRIVING',
            fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
            internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          });

          if (cancelled) return;

          const primaryRoute = routes?.[0];
          if (primaryRoute) {
            const newPolylines: google.maps.Polyline[] = primaryRoute.createPolylines();
            newPolylines.forEach((polyline) => {
              polyline.setOptions({
                strokeColor: '#9E1B24',
                strokeWeight: 5,
                strokeOpacity: 0.9,
              });
              polyline.setMap(map);
            });
            polylinesRef.current = newPolylines;

            if (primaryRoute.viewport) {
              map.fitBounds(primaryRoute.viewport);
            } else {
              map.fitBounds(bounds);
            }

            const meters = Number(primaryRoute.distanceMeters || 0);
            const millis = Number(primaryRoute.durationMillis || 0);
            const miles = (meters / 1609.344).toFixed(1);
            const mins = Math.max(1, Math.round(millis / 60000));
            onRouteSummary({
              distanceText: `${miles} mi`,
              durationText: `${mins} min drive`,
            });
          } else {
            map.fitBounds(bounds);
            onRouteSummary(null);
          }
        } else {
          map.panTo(resolved[0].location);
          map.setZoom(13);
          onRouteSummary(null);
        }

        onMapStatus({ loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteSummary(null);
        onMapStatus({
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : 'Unable to calculate store route right now. Try updating your city or ZIP.',
        });
      }
    };

    void computeStopsAndRoute();

    return () => {
      cancelled = true;
      clearPolylines();
    };
  }, [map, placesLib, routesLib, coreLib, storeStops, areaQuery, userOrigin, plotNonce, onRouteSummary, onMapStatus]);

  return (
    <>
      {originCenter && (
        <AdvancedMarker position={originCenter} title="Starting Point">
          <div className="px-2.5 py-1 rounded-full bg-[#26181C] text-white text-[11px] font-semibold shadow-md border-2 border-white whitespace-nowrap">
            Start
          </div>
        </AdvancedMarker>
      )}

      {resolvedStops.map((stop) => (
        <AdvancedMarker
          key={`${stop.storeName}-${stop.stopIndex}`}
          position={stop.location}
          title={`Stop #${stop.stopIndex}: ${stop.displayName}`}
          onClick={() => setSelectedStop(stop)}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#9E1B24] text-white text-xs font-bold shadow-md border-2 border-[#FAF6F0] cursor-pointer hover:scale-105 transition-transform whitespace-nowrap">
            <span className="tabular-nums">{stop.stopIndex}</span>
            <span className="font-semibold max-w-[110px] truncate">{stop.storeName}</span>
          </div>
        </AdvancedMarker>
      ))}

      {selectedStop && (
        <InfoWindow
          position={selectedStop.location}
          onCloseClick={() => setSelectedStop(null)}
          maxWidth={260}
        >
          <div className="p-1 text-[#26181C] space-y-1.5">
            <p className="text-xs font-bold text-[#9E1B24]">
              Stop #{selectedStop.stopIndex} · {selectedStop.displayName}
            </p>
            <p className="text-[11px] text-[#7D6959]">{selectedStop.formattedAddress}</p>
            <div className="pt-1 border-t border-[#E4D7C5] text-[11px] space-y-0.5">
              {selectedStop.items.map((item) => (
                <p key={item.id} className="font-medium truncate">
                  • {item.title} (${item.estimatedPrice.toFixed(0)})
                </p>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-[#1D6B3C] tabular-nums">
              Stop Total: ${selectedStop.subtotal.toFixed(2)}
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const ShoppingRoutesView: React.FC<ShoppingRoutesViewProps> = ({
  uid,
  gifts,
  onBackToCommandCenter,
}) => {
  const [shoppingMode, setShoppingMode] = useState<'in_store' | 'online'>('in_store');

  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [areaInput, setAreaInput] = useState('Chicago, IL');
  const [activeArea, setActiveArea] = useState('Chicago, IL');
  const [userOrigin, setUserOrigin] = useState<google.maps.LatLngLiteral | null>(null);
  const [plotNonce, setPlotNonce] = useState(0);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [mapStatus, setMapStatus] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (mapsApiKey) return;
    let active = true;
    fetch('/api/config/maps')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.apiKey) {
          setMapsApiKey(String(data.apiKey));
        }
      })
      .catch(() => {
        // Ignore config lookup errors
      });
    return () => {
      active = false;
    };
  }, [mapsApiKey]);

  const unpurchased = useMemo(() => gifts.filter((g) => g.status === 'planned'), [gifts]);

  const inStoreGifts = useMemo(
    () => unpurchased.filter((g) => g.fulfillmentMode === 'in_store'),
    [unpurchased]
  );

  const onlineGifts = useMemo(
    () => unpurchased.filter((g) => g.fulfillmentMode === 'online'),
    [unpurchased]
  );

  const storeStops = useMemo<StoreStopGroup[]>(() => {
    const groups: Record<string, StoreStopGroup> = {};

    for (const gift of inStoreGifts) {
      const key = (gift.storeName || 'Local Store').trim();
      const existing = groups[key];
      if (existing) {
        existing.items.push(gift);
        existing.subtotal += gift.estimatedPrice;
        existing.stopOrder = Math.min(existing.stopOrder, gift.storeStopOrder || 1);
      } else {
        groups[key] = {
          storeName: key,
          stopOrder: gift.storeStopOrder || 1,
          items: [gift],
          subtotal: gift.estimatedPrice,
        };
      }
    }

    return Object.values(groups).sort((a, b) => a.stopOrder - b.stopOrder);
  }, [inStoreGifts]);

  const handleMoveStop = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= storeStops.length) return;
    const currentStop = storeStops[index];
    const swapStop = storeStops[targetIdx];

    await Promise.all([
      ...currentStop.items.map((item) =>
        updateGiftRouting(uid, item.id, { storeStopOrder: targetIdx + 1 })
      ),
      ...swapStop.items.map((item) =>
        updateGiftRouting(uid, item.id, { storeStopOrder: index + 1 })
      ),
    ]);
  };

  const handleToggleItemMode = async (gift: GiftItem) => {
    await updateGiftRouting(uid, gift.id, {
      fulfillmentMode: gift.fulfillmentMode === 'in_store' ? 'online' : 'in_store',
    });
  };

  const handleSwitchAllToOnline = async () => {
    await Promise.all(
      inStoreGifts.map((g) => updateGiftRouting(uid, g.id, { fulfillmentMode: 'online' }))
    );
    setShoppingMode('online');
  };

  const handlePlotAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserOrigin(null);
    setActiveArea(areaInput.trim() || 'Chicago, IL');
    setPlotNonce((n) => n + 1);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAreaInput('My Current Location');
        setActiveArea('');
        setPlotNonce((n) => n + 1);
      },
      () => {
        setMapStatus((prev) => ({
          ...prev,
          error: 'Location permission was declined. Enter a City or ZIP above to plot nearby stores.',
        }));
      }
    );
  };

  const handleRouteSummary = useCallback((summary: RouteSummary | null) => {
    setRouteSummary(summary);
  }, []);

  const handleMapStatus = useCallback((status: { loading: boolean; error: string | null }) => {
    setMapStatus(status);
  }, []);

  return (
    <div className="space-y-6">
      {onBackToCommandCenter && (
        <button
          type="button"
          onClick={onBackToCommandCenter}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#9E1B24] dark:hover:text-[#FB7185] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Command Center</span>
        </button>
      )}

      <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <BlushPinkTreeIcon className="w-11 h-11 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7D6959] dark:text-[#C4B0A2]">
              Errand Planner &amp; Live Map
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#26181C] dark:text-[#F5EFE8]">
              Santa&apos;s Shopping Route
            </h1>
            <p className="text-xs sm:text-sm text-[#7D6959] dark:text-[#C4B0A2]">
              Map your store stops in driving order to save time, or toggle Buy Online for instant checkout.
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#FAF6F0] dark:bg-[#151012] border border-[#E4D7C5] dark:border-[#3A2C30] self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setShoppingMode('in_store')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              shoppingMode === 'in_store'
                ? 'bg-[#9E1B24] text-white'
                : 'text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            In-Store Route ({inStoreGifts.length})
          </button>
          <button
            type="button"
            onClick={() => setShoppingMode('online')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              shoppingMode === 'online'
                ? 'bg-[#9E1B24] text-white'
                : 'text-[#7D6959] dark:text-[#C4B0A2] hover:text-[#26181C] dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Buy Online ({onlineGifts.length})
          </button>
        </div>
      </div>

      {shoppingMode === 'in_store' ? (
        <div className="space-y-5">
          {/* Interactive Google Map Route Card */}
          <section className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#E4D7C5] dark:border-[#3A2C30] flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#FAF6F0] dark:bg-[#151012]">
              <form
                onSubmit={handlePlotAreaSubmit}
                className="flex flex-wrap items-center gap-2 flex-1"
              >
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Compass className="w-4 h-4 text-[#9E1B24] dark:text-[#FB7185] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={areaInput}
                    onChange={(e) => setAreaInput(e.target.value)}
                    placeholder="Starting City or ZIP (e.g., 60611)"
                    aria-label="Starting City or ZIP for shopping route"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#C9B59C] dark:border-[#3A2C30] bg-[#FFFDFB] dark:bg-[#1F171A] text-xs font-medium"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9E1B24] hover:bg-[#7F141C] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  <RouteIcon className="w-3.5 h-3.5" />
                  Plot Store Route
                </button>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#C9B59C] dark:border-[#3A2C30] bg-[#FFFDFB] dark:bg-[#1F171A] hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
                  Use My Location
                </button>
              </form>

              <div className="flex items-center gap-3 text-xs text-[#7D6959] dark:text-[#C4B0A2] shrink-0">
                {mapStatus.loading && (
                  <span className="inline-flex items-center gap-1.5 text-[#9E1B24] dark:text-[#FB7185] font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Mapping stops...
                  </span>
                )}
                {!mapStatus.loading && routeSummary && (
                  <span className="inline-flex items-center gap-2 font-semibold tabular-nums text-[#1D6B3C] dark:text-[#4ADE80]">
                    <span>{routeSummary.distanceText}</span>
                    <span>·</span>
                    <span>{routeSummary.durationText}</span>
                  </span>
                )}
              </div>
            </div>

            {mapStatus.error && (
              <div className="px-5 py-2.5 bg-[#FBF0F3] dark:bg-[#2B1D22] border-b border-[#E4D7C5] dark:border-[#3A2C30] text-xs text-[#9E1B24] dark:text-[#FB7185]">
                {mapStatus.error}
              </div>
            )}

            <div className="w-full h-[380px] sm:h-[420px] relative bg-[#FAF6F0] dark:bg-[#151012]">
              {!mapsApiKey ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <GirlyGingerbreadCookieIcon className="w-12 h-12" />
                  <p className="text-sm font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                    Interactive Shopping Route Map
                  </p>
                  <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] max-w-md">
                    Configure your Google Maps API key to display interactive store pins and driving directions across your stop list.
                  </p>
                </div>
              ) : (
                <APIProvider apiKey={mapsApiKey} libraries={['places', 'routes', 'marker']}>
                  <GoogleMap
                    mapId="DEMO_MAP_ID"
                    defaultCenter={DEFAULT_CENTER}
                    defaultZoom={11}
                    gestureHandling="greedy"
                    mapTypeControl={false}
                    streetViewControl={false}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    className="w-full h-full"
                  >
                    <RouteMapCanvas
                      storeStops={storeStops}
                      areaQuery={activeArea}
                      userOrigin={userOrigin}
                      plotNonce={plotNonce}
                      onRouteSummary={handleRouteSummary}
                      onMapStatus={handleMapStatus}
                    />
                  </GoogleMap>
                </APIProvider>
              )}
            </div>
          </section>

          {storeStops.length > 0 && (
            <div className="rounded-2xl bg-[#FBF0F3] dark:bg-[#1F171A] border border-[#C9B59C] dark:border-[#3A2C30] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-[#26181C] dark:text-[#F5EFE8] tabular-nums">
                <span className="font-semibold">Route Summary:</span> {storeStops.length} store{' '}
                {storeStops.length === 1 ? 'stop' : 'stops'} · {inStoreGifts.length} items to pick up · Est. $
                {inStoreGifts.reduce((s, g) => s + g.estimatedPrice, 0).toFixed(2)}
                {routeSummary ? ` · ${routeSummary.distanceText} (${routeSummary.durationText})` : ''}
              </p>
              <button
                type="button"
                onClick={handleSwitchAllToOnline}
                className="text-xs font-semibold text-[#9E1B24] dark:text-[#FB7185] hover:underline whitespace-nowrap cursor-pointer"
              >
                Toggle all to Buy Online instead →
              </button>
            </div>
          )}

          {storeStops.length === 0 ? (
            <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-12 text-center space-y-2">
              <Store className="w-10 h-10 text-[#C9B59C] mx-auto" />
              <p className="text-sm font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                No in-store errands waiting right now
              </p>
              <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                Planned gifts set to &ldquo;In-Store Route&rdquo; are automatically organized by store and plotted on the map above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {storeStops.map((stop, idx) => (
                <div
                  key={stop.storeName}
                  className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] overflow-hidden"
                >
                  <div className="px-6 py-4 bg-[#FAF6F0] dark:bg-[#151012] border-b border-[#E4D7C5] dark:border-[#3A2C30] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#9E1B24] text-white text-xs font-bold flex items-center justify-center tabular-nums shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                          {stop.storeName}
                        </h3>
                        <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] tabular-nums">
                          {stop.items.length} item{stop.items.length === 1 ? '' : 's'} · Stop Est. $
                          {stop.subtotal.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          activeArea ? `${stop.storeName} near ${activeArea}` : stop.storeName
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C9B59C] dark:border-[#3A2C30] bg-[#FFFDFB] dark:bg-[#1F171A] text-xs font-medium hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22]"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#9E1B24] dark:text-[#FB7185]" />
                        <span>Directions</span>
                      </a>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveStop(idx, -1)}
                        aria-label={`Move ${stop.storeName} earlier`}
                        className="p-1.5 rounded-lg border border-[#C9B59C] dark:border-[#3A2C30] disabled:opacity-35 hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] cursor-pointer"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === storeStops.length - 1}
                        onClick={() => handleMoveStop(idx, 1)}
                        aria-label={`Move ${stop.storeName} later`}
                        className="p-1.5 rounded-lg border border-[#C9B59C] dark:border-[#3A2C30] disabled:opacity-35 hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] cursor-pointer"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-[#E4D7C5] dark:divide-[#3A2C30]">
                    {stop.items.map((item) => (
                      <div
                        key={item.id}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-sm text-[#26181C] dark:text-[#F5EFE8]">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] tabular-nums">
                            For {item.memberName} · Est. ${item.estimatedPrice.toFixed(2)} ·{' '}
                            {item.availabilityStatus === 'low_stock'
                              ? 'Low Stock Alert'
                              : item.availabilityStatus === 'in_stock'
                                ? 'In Stock'
                                : 'Check Shelf'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleItemMode(item)}
                            className="px-3 py-1.5 rounded-lg border border-[#C9B59C] dark:border-[#3A2C30] text-xs font-medium hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] cursor-pointer"
                          >
                            Switch to Online
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateGiftStatus(
                                uid,
                                item.id,
                                'purchased',
                                item.actualPrice > 0 ? item.actualPrice : item.estimatedPrice
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D6B3C] hover:bg-[#16542F] text-white text-xs font-semibold cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark Purchased
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {onlineGifts.length === 0 ? (
            <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] p-12 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-[#C9B59C] mx-auto" />
              <p className="text-sm font-semibold text-[#26181C] dark:text-[#F5EFE8]">
                No online orders pending
              </p>
              <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">
                Switch any planned gift from In-Store Route to Buy Online to manage all web checkouts here.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#FFFDFB] dark:bg-[#1F171A] border border-[#E4D7C5] dark:border-[#3A2C30] divide-y divide-[#E4D7C5] dark:divide-[#3A2C30] overflow-hidden">
              {onlineGifts.map((item) => (
                <div
                  key={item.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm text-[#26181C] dark:text-[#F5EFE8]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2] tabular-nums">
                      For {item.memberName} · {item.storeName} · Est. ${item.estimatedPrice.toFixed(2)}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-[#7D6959] dark:text-[#C4B0A2]">{item.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleItemMode(item)}
                      className="px-3 py-1.5 rounded-lg border border-[#C9B59C] dark:border-[#3A2C30] text-xs font-medium hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22] cursor-pointer"
                    >
                      Move to In-Store
                    </button>
                    <a
                      href={
                        item.purchaseUrl ||
                        `https://www.google.com/search?q=${encodeURIComponent(
                          `${item.title} ${item.storeName}`
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#C9B59C] dark:border-[#3A2C30] bg-[#FAF6F0] dark:bg-[#151012] text-xs font-semibold hover:bg-[#FBF0F3] dark:hover:bg-[#2B1D22]"
                    >
                      <span>Open Store</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        updateGiftStatus(
                          uid,
                          item.id,
                          'purchased',
                          item.actualPrice > 0 ? item.actualPrice : item.estimatedPrice
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D6B3C] hover:bg-[#16542F] text-white text-xs font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Ordered
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

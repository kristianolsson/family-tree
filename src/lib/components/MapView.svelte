<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { markerRadius, clusterGroups } from '$lib/data/ancestorMap.js';
  import { buildPopupContent } from './mapPopup.js';
  import 'leaflet/dist/leaflet.css';

  let { groups, noun = 'ancestors', onSelectPerson } = $props();

  let container;

  onMount(() => {
    let map;
    let cancelled = false;

    (async () => {
      const leaflet = await import('leaflet');
      const L = leaflet.default ?? leaflet;
      // leaflet.heat reads the global L when it loads, so set it first.
      window.L = L;
      await import('leaflet.heat');
      if (cancelled) return;

      map = L.map(container);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(map);

      L.heatLayer(
        groups.map((g) => [g.lat, g.lng, g.count]),
        { radius: 25, blur: 20, max: Math.max(1, ...groups.map((g) => g.count)) }
      ).addTo(map);

      // Circles are rebuilt on every zoom: groups that would overlap on
      // screen at this zoom merge into one, and split again as you zoom in.
      const markers = L.layerGroup().addTo(map);
      const drawMarkers = () => {
        markers.clearLayers();
        const zoom = map.getZoom();
        const clusters = clusterGroups(groups, (lat, lng) => map.project([lat, lng], zoom));
        // Biggest first so small circles stay clickable on top of large ones.
        for (const g of clusters.sort((a, b) => b.count - a.count)) {
          const marker = L.circleMarker([g.lat, g.lng], {
            radius: markerRadius(g.count),
            weight: 1,
            fillOpacity: 0.35
          }).addTo(markers);
          const popup = buildPopupContent(g, {
            noun,
            personHref: (id) => `${base}/person/${id}`,
            onSelectPerson,
            // Re-measure after the person list opens or closes.
            onResize: () => marker.getPopup()?.update()
          });
          // Long place/people lists scroll inside the popup instead of
          // running off the map.
          const maxHeight = Math.max(160, Math.round(container.clientHeight * 0.6));
          marker.bindPopup(popup, { maxWidth: 320, maxHeight });
        }
      };
      map.on('zoomend', drawMarkers);

      if (groups.length > 0) {
        map.fitBounds(
          groups.map((g) => [g.lat, g.lng]),
          { padding: [40, 40], maxZoom: 8 }
        );
      } else {
        map.setView([20, 0], 2);
      }
      drawMarkers();
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  });
</script>

<div class="map" bind:this={container}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }
  /* Popup content is built outside Svelte (mapPopup.js), so these are global. */
  .map :global(.map-popup-toggle) {
    padding: 0;
    border: 0;
    background: none;
    color: #0078a8;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .map :global(.map-popup-more) {
    margin: 0.15rem 0 0 1.1rem;
    font-size: 0.9em;
  }
  .map :global(.map-popup-places),
  .map :global(.map-popup-people) {
    margin: 0.25rem 0 0;
    padding-left: 1.1rem;
  }
</style>

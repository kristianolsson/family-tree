<script>
  import { onMount } from 'svelte';
  import { markerRadius } from '$lib/data/ancestorMap.js';
  import 'leaflet/dist/leaflet.css';

  let { groups } = $props();

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

      // Biggest first so small circles stay clickable on top of large ones.
      for (const g of [...groups].sort((a, b) => b.count - a.count)) {
        const text = `${g.place} — ${g.count} ancestor${g.count === 1 ? '' : 's'}`;
        L.circleMarker([g.lat, g.lng], {
          radius: markerRadius(g.count),
          weight: 1,
          fillOpacity: 0.35
        })
          .addTo(map)
          .bindPopup(document.createTextNode(text));
      }

      if (groups.length > 0) {
        map.fitBounds(
          groups.map((g) => [g.lat, g.lng]),
          { padding: [40, 40], maxZoom: 8 }
        );
      } else {
        map.setView([20, 0], 2);
      }
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
</style>

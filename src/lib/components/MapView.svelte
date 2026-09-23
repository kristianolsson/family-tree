<script>
  import { onMount } from 'svelte';
  import { markerRadius } from '$lib/data/ancestorMap.js';
  import 'leaflet/dist/leaflet.css';

  let { groups, noun = 'ancestors' } = $props();

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
        const plural = (n) => (n === 1 ? `1 ${noun === 'people' ? 'person' : 'ancestor'}` : `${n} ${noun}`);
        // Text nodes only, so place names are never parsed as HTML.
        const popup = document.createElement('div');
        if (g.places.length === 1) {
          popup.textContent = `${g.places[0].place} — ${plural(g.count)}`;
        } else {
          const title = document.createElement('strong');
          title.textContent = plural(g.count);
          const list = document.createElement('ul');
          list.style.margin = '0.25rem 0 0';
          list.style.paddingLeft = '1.1rem';
          for (const { place, count } of g.places) {
            const item = document.createElement('li');
            item.textContent = `${place} (${count})`;
            list.append(item);
          }
          popup.append(title, list);
        }
        L.circleMarker([g.lat, g.lng], {
          radius: markerRadius(g.count),
          weight: 1,
          fillOpacity: 0.35
        })
          .addTo(map)
          .bindPopup(popup);
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

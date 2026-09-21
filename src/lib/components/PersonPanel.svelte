<script>
  import { formatPartialDate, primaryName } from '$lib/data/formatDate.js';
  import SourceImageModal from './SourceImageModal.svelte';

  let { person, model } = $props();

  let openSourceId = $state(null);
  let openSource = $derived(openSourceId ? model.sourcesById.get(openSourceId) : null);

  function formatDatePlace(info) {
    if (!info) return 'unknown';
    const datePart = formatPartialDate(info) || 'unknown';
    return info.place ? `${datePart}, ${info.place}` : datePart;
  }

  function formatDeath(info) {
    const base = formatDatePlace(info);
    return info.age_at_death ? `${base} (age ${info.age_at_death})` : base;
  }

  function unionLabel(type) {
    return type === 'sambo' || type === 'sarbo' ? 'Partner' : 'Married';
  }

  let otherNames = $derived(
    person.names
      .map((n) => n.value)
      .filter((value, index, arr) => value !== primaryName(person) && arr.indexOf(value) === index)
  );

  let marriages = $derived(
    (model.partnerFamiliesOf.get(person.id) || [])
      .map((familyId) => {
        const family = model.familiesById.get(familyId);
        if (!family.marriage?.date && !family.marriage?.year) return null;
        const date = formatDatePlace(family.marriage);
        const spouseId = family.partners.find((p) => p && p !== person.id);
        const spouse = spouseId ? model.peopleById.get(spouseId) : null;
        return {
          familyId,
          label: unionLabel(family.marriage.type),
          text: spouse ? `${primaryName(spouse)} — ${date}` : date
        };
      })
      .filter(Boolean)
  );

  // Optional external links; only http(s) URLs are rendered as anchors.
  let links = $derived(
    (person.links || []).filter((l) => l && /^https?:\/\//i.test(l.url || ''))
  );

  let sourceCitations = $derived(
    (person.sources || []).map((id) => {
      const source = model.sourcesById.get(id);
      return {
        id,
        label: source ? `${id} — ${source.description}` : id,
        hasImage: Boolean(source?.file)
      };
    })
  );
</script>

<section class="person-panel" aria-label="Person details">
  <h2>{primaryName(person)}</h2>
  <dl>
    {#if otherNames.length}
      <dt>Also known as</dt>
      <dd>{otherNames.join(', ')}</dd>
    {/if}
    <dt>Born</dt>
    <dd>{formatDatePlace(person.birth)}</dd>
    {#if person.death?.date || person.death?.year}
      <dt>Died</dt>
      <dd>{formatDeath(person.death)}</dd>
    {/if}
    {#each marriages as marriage (marriage.familyId)}
      <dt>{marriage.label}</dt>
      <dd>{marriage.text}</dd>
    {/each}
    {#if person.occupation?.length}
      <dt>Occupation</dt>
      <dd>{person.occupation.join(', ')}</dd>
    {/if}
  </dl>
  {#if person.notes}
    <p class="notes">{person.notes}</p>
  {/if}
  {#if links.length}
    <ul class="links">
      {#each links as link (link.url)}
        <li><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label || link.url}</a></li>
      {/each}
    </ul>
  {/if}
  {#if sourceCitations.length}
    <ul class="sources">
      {#each sourceCitations as citation (citation.id)}
        <li>
          {#if citation.hasImage}
            <button type="button" onclick={() => (openSourceId = citation.id)}>
              {citation.label}
            </button>
          {:else}
            {citation.label}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<SourceImageModal source={openSource} onClose={() => (openSourceId = null)} />

<style>
  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.15rem;
  }
  dl {
    margin: 0 0 1rem;
  }
  dt {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--ink-dim);
    margin-top: 0.6rem;
  }
  dt:first-child {
    margin-top: 0;
  }
  dd {
    margin: 0.15rem 0 0;
  }
  .notes {
    font-size: 0.9rem;
    color: var(--ink-dim);
    border-top: 1px solid var(--rule);
    padding-top: 0.75rem;
  }
  .links {
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0.75rem 0 0;
    border-top: 1px solid var(--rule);
    font-size: 0.85rem;
  }
  .links li {
    margin-top: 0.25rem;
  }
  .links a {
    color: var(--accent);
  }
  .sources {
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0.75rem 0 0;
    border-top: 1px solid var(--rule);
    font-size: 0.8rem;
    color: var(--ink-dim);
  }
  .sources li {
    margin-top: 0.25rem;
  }
  .sources button {
    all: unset;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
  }
</style>

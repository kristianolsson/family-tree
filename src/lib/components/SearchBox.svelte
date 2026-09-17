<script>
  import { searchPeople } from '$lib/data/search.js';

  let { index, onSelect } = $props();

  let query = $state('');
  let results = $derived(query.trim() ? searchPeople(index, query) : []);

  function choose(id) {
    onSelect(id);
    query = '';
  }
</script>

<div class="search-box">
  <input
    type="search"
    placeholder="Search by name…"
    aria-label="Search by name"
    bind:value={query}
  />
  {#if results.length}
    <ul>
      {#each results as result (result.id)}
        <li>
          <button type="button" onclick={() => choose(result.id)}>
            {result.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search-box {
    position: relative;
    width: min(320px, 100%);
  }
  .search-box input {
    width: 100%;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--rule);
    border-radius: 4px;
    background: var(--bg);
    color: var(--ink);
    font-family: inherit;
    font-size: inherit;
  }
  .search-box ul {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 50vh;
    overflow-y: auto;
    margin: 0.25rem 0 0;
    padding: 0;
    list-style: none;
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 4px;
    z-index: 10;
  }
  .search-box li button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.4rem 0.6rem;
    border: none;
    background: none;
    color: var(--ink);
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
  }
  .search-box li button:hover {
    background: var(--bg);
  }
</style>

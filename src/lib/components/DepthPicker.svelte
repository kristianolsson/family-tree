<script>
  import { PROGENY_DEPTH_OPTIONS } from '$lib/config.js';

  let { value, onChange } = $props();

  function label(option) {
    return option === 'all' ? 'All' : String(option);
  }
</script>

<div class="depth-picker" role="group" aria-label="Levels down to show">
  <span class="depth-picker-label">Levels:</span>
  {#each PROGENY_DEPTH_OPTIONS as option (option)}
    <button
      type="button"
      class:active={option === value}
      aria-pressed={option === value}
      onclick={() => onChange(option)}
    >
      {label(option)}
    </button>
  {/each}
</div>

<style>
  .depth-picker {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .depth-picker-label {
    font-size: 0.85rem;
    color: var(--ink-dim);
    margin-right: 0.25rem;
  }
  button {
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--rule);
    border-radius: 4px;
    background: var(--bg);
    color: var(--ink);
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
  }
  button.active {
    background: var(--accent);
    color: var(--bg);
    border-color: var(--accent);
  }
</style>

<script>
  let { label, options, value, onChange } = $props();

  function optionLabel(option) {
    return option === 'all' ? 'All' : String(option);
  }
</script>

<div class="depth-picker" role="group" aria-label={label}>
  <span class="depth-picker-label">{label}:</span>
  {#each options as option (option)}
    <button
      type="button"
      class:active={option === value}
      aria-pressed={option === value}
      onclick={() => onChange(option)}
    >
      {optionLabel(option)}
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

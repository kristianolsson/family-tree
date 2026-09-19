<script>
  let { label, options, value, onChange } = $props();

  function optionLabel(option) {
    return option === 'all' ? 'All' : String(option);
  }
</script>

<label class="depth-picker">
  <span class="depth-picker-label">{label}:</span>
  <select
    value={String(value)}
    onchange={(e) => onChange(options.find((o) => String(o) === e.currentTarget.value))}
  >
    {#each options as option (option)}
      <option value={String(option)}>{optionLabel(option)}</option>
    {/each}
  </select>
</label>

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
  select {
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--rule);
    border-radius: 4px;
    background: var(--bg);
    color: var(--ink);
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
  }
</style>

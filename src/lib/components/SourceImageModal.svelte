<script>
  import { base } from '$app/paths';

  let { source, onClose } = $props();

  function handleKeydown(e) {
    if (source && e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if source}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- Escape already closes the modal via the svelte:window handler above, and the
       close button is the fully keyboard-accessible way to dismiss it -- this backdrop
       click is a mouse-only convenience layered on top of both. -->
  <div class="modal-overlay" role="presentation" onclick={onClose}>
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-label={source.description}
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <button type="button" class="modal-close" aria-label="Close" onclick={onClose}>×</button>
      <img src={`${base}/data/${source.file}`} alt={source.description} />
      <p class="modal-caption">{source.description}</p>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 2rem;
  }
  .modal-content {
    position: relative;
    max-width: min(90vw, 900px);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .modal-content img {
    max-width: 100%;
    max-height: 80vh;
    object-fit: contain;
    background: var(--surface, #fff);
    border-radius: 4px;
  }
  .modal-caption {
    color: #fff;
    font-size: 0.85rem;
    text-align: center;
    margin: 0;
  }
  .modal-close {
    position: absolute;
    top: -2.5rem;
    right: 0;
    background: none;
    border: none;
    color: #fff;
    font-size: 1.75rem;
    line-height: 1;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
  }
</style>

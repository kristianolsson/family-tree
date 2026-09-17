import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SourceImageModal from '../../../src/lib/components/SourceImageModal.svelte';

const source = {
  id: 'S1',
  file: 'images/S1.jpg',
  description: 'Printed genealogy chart, Eriksson line'
};

describe('SourceImageModal', () => {
  it('renders nothing when there is no open source', () => {
    render(SourceImageModal, { props: { source: null, onClose: vi.fn() } });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the image and caption for the open source', () => {
    render(SourceImageModal, { props: { source, onClose: vi.fn() } });
    const img = screen.getByRole('img', { name: source.description });
    expect(img).toHaveAttribute('src', '/data/images/S1.jpg');
    expect(screen.getByText(source.description)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(SourceImageModal, { props: { source, onClose } });
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the backdrop but not when clicking the dialog content', async () => {
    const onClose = vi.fn();
    const { container } = render(SourceImageModal, { props: { source, onClose } });
    await fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    await fireEvent.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(SourceImageModal, { props: { source, onClose } });
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

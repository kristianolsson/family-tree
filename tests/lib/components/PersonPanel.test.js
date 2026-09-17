import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PersonPanel from '../../../src/lib/components/PersonPanel.svelte';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';
import { people, families, sources } from '../../fixtures/sampleDataset.js';

const model = buildFamilyTreeModel({ people, families, sources });

describe('PersonPanel', () => {
  it('shows name, birth, death, and occupation', () => {
    render(PersonPanel, {
      props: { person: model.peopleById.get('P1'), model }
    });
    expect(screen.getByRole('heading', { name: 'Anders Eriksson' })).toBeInTheDocument();
    expect(screen.getByText('1851-04-02, Sorby, Vaster Y')).toBeInTheDocument();
    expect(screen.getByText('1928-07-15, Norrby, Vaster Y (age 77)')).toBeInTheDocument();
    expect(screen.getByText('Torpare hemmansagare (crofter/smallholder)')).toBeInTheDocument();
  });

  it('omits the death row entirely when death is unknown', () => {
    render(PersonPanel, {
      props: { person: model.peopleById.get('P3'), model }
    });
    expect(screen.queryByText('Died')).not.toBeInTheDocument();
  });

  it('omits the death row when a death record exists but has no date or year', () => {
    const p1 = model.peopleById.get('P1');
    render(PersonPanel, {
      props: {
        person: { ...p1, death: { date: null, year: null, place: null, age_at_death: null, source_id: 'S1' } },
        model
      }
    });
    expect(screen.queryByText('Died')).not.toBeInTheDocument();
  });

  it('shows notes only when present', () => {
    render(PersonPanel, {
      props: { person: model.peopleById.get('P5'), model }
    });
    expect(screen.getByText(/disagree on birth year/)).toBeInTheDocument();
  });

  it('lists each source id with its description', () => {
    render(PersonPanel, {
      props: { person: model.peopleById.get('P5'), model }
    });
    expect(screen.getByText('S2 — Ahnentafel narrative')).toBeInTheDocument();
    expect(screen.getByText('S3 — Handwritten annotation')).toBeInTheDocument();
  });

  it('omits the age suffix when age_at_death is unknown', () => {
    const p1 = model.peopleById.get('P1');
    render(PersonPanel, {
      props: {
        person: { ...p1, death: { ...p1.death, age_at_death: null } },
        model
      }
    });
    expect(screen.getByText('1928-07-15, Norrby, Vaster Y')).toBeInTheDocument();
  });

  it('falls back to year-only when there is no full birth date', () => {
    render(PersonPanel, {
      props: { person: model.peopleById.get('P2'), model }
    });
    expect(screen.getByText('1854')).toBeInTheDocument();
  });

  it('shows other name variants as "Also known as", excluding the primary name', () => {
    const p1 = model.peopleById.get('P1');
    render(PersonPanel, {
      props: {
        person: {
          ...p1,
          names: [
            { value: 'Anders Eriksson', type: 'birth', source_id: 'S1' },
            { value: 'Anders Eric', type: 'variant', source_id: 'S1' }
          ]
        },
        model
      }
    });
    expect(screen.getByText('Also known as')).toBeInTheDocument();
    expect(screen.getByText('Anders Eric')).toBeInTheDocument();
    expect(screen.queryByText('Anders Eriksson', { selector: 'dd' })).not.toBeInTheDocument();
  });

  it('omits "Also known as" when there is only one name', () => {
    render(PersonPanel, {
      props: { person: model.peopleById.get('P1'), model }
    });
    expect(screen.queryByText('Also known as')).not.toBeInTheDocument();
  });

  it('opens the source image modal when a citation with an image is clicked', async () => {
    render(PersonPanel, {
      props: { person: model.peopleById.get('P5'), model }
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'S2 — Ahnentafel narrative' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/data/images/2.jpg');
  });

  it('renders a source with no file as plain text, not a button', () => {
    render(PersonPanel, {
      props: {
        person: { ...model.peopleById.get('P1'), sources: ['S9'] },
        model: {
          ...model,
          sourcesById: new Map([...model.sourcesById, ['S9', { id: 'S9', description: 'No image on file' }]])
        }
      }
    });
    expect(screen.getByText('S9 — No image on file')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /No image on file/ })).not.toBeInTheDocument();
  });

  it('shows a dated marriage with the spouse’s name', () => {
    render(PersonPanel, {
      props: { person: model.peopleById.get('P1'), model }
    });
    expect(screen.getByText('Married')).toBeInTheDocument();
    expect(screen.getByText('Maria Karlsson — 1876-05-20, Vaster Y')).toBeInTheDocument();
  });

  it('omits a marriage entry when the union has no date recorded', () => {
    // P1's second family (F3, with P6) has no marriage date in the fixture --
    // only one "Married" row (F1/P2) should render, not two.
    render(PersonPanel, {
      props: { person: model.peopleById.get('P1'), model }
    });
    expect(screen.getAllByText('Married')).toHaveLength(1);
  });

  it('labels a sambo/sarbo union "Partner" instead of "Married"', () => {
    const modifiedModel = {
      ...model,
      familiesById: new Map(model.familiesById).set('F1', {
        ...model.familiesById.get('F1'),
        marriage: { date: '1990-06-01', place: null, type: 'sambo' }
      })
    };
    render(PersonPanel, {
      props: { person: model.peopleById.get('P1'), model: modifiedModel }
    });
    expect(screen.getByText('Partner')).toBeInTheDocument();
    expect(screen.queryByText('Married')).not.toBeInTheDocument();
  });
});

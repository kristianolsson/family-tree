import { describe, expect, it } from 'vitest';
import { buildFamilyTreeModel } from '../../../src/lib/data/adapter.js';
import { people, families, sources } from '../../fixtures/sampleDataset.js';

describe('buildFamilyTreeModel', () => {
  const model = buildFamilyTreeModel({ people, families, sources });

  it('indexes people, families, and sources by id', () => {
    expect(model.peopleById.get('P1').names[0].value).toBe('Anders Eriksson');
    expect(model.familiesById.get('F1').children).toEqual(['P3', 'P5']);
    expect(model.sourcesById.get('S2').description).toBe('Ahnentafel narrative');
  });

  it('maps a child to the one family they were born into', () => {
    expect(model.childFamilyOf.get('P3')).toBe('F1');
    expect(model.childFamilyOf.get('P5')).toBe('F1');
  });

  it('has no child-family entry for a person with unknown parents', () => {
    expect(model.childFamilyOf.has('P1')).toBe(false);
    expect(model.childFamilyOf.has('P4')).toBe(false);
  });

  it('lists every family a remarried person is a partner in', () => {
    expect(model.partnerFamiliesOf.get('P1')).toEqual(['F1', 'F3']);
  });

  it('still lists a family with an unknown (null) partner', () => {
    expect(model.partnerFamiliesOf.get('P3')).toEqual(['F2']);
  });

  it('has no partner-family entry for someone who was never a partner', () => {
    expect(model.partnerFamiliesOf.has('P4')).toBe(false);
  });
});

import { error } from '@sveltejs/kit';
import { loadDataset } from '$lib/data/loadDataset.js';
import { buildFamilyTreeModel } from '$lib/data/adapter.js';

export async function load({ params, fetch }) {
  const dataset = await loadDataset(fetch);
  const model = buildFamilyTreeModel(dataset);
  if (!model.peopleById.has(params.id)) error(404, 'Person not found');
  return { model, personId: params.id };
}

import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { DEFAULT_PERSON_ID } from '$lib/config.js';

export function load() {
  redirect(307, `${base}/person/${DEFAULT_PERSON_ID}`);
}

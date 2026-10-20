import type { APIRoute } from 'astro';
import { hasRole } from '../../../../lib/utils/permissions';
import { getSettingsGroup, updateSettingsGroup, type SettingGroup } from '../../../../lib/services/settings.service';

const GROUPS: SettingGroup[] = ['general', 'security'];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function authorize(locals: App.Locals, group: string | undefined) {
  if (!locals.user) return json({ message: 'Unauthorized' }, 401);
  if (!(await hasRole(locals.user.id, 'administrator'))) return json({ message: 'Administrator access required' }, 403);
  if (!group || !GROUPS.includes(group as SettingGroup)) return json({ message: 'Unknown settings group' }, 404);
  return null;
}

export const GET: APIRoute = async ({ params, locals }) => {
  const denied = await authorize(locals, params.group);
  if (denied) return denied;

  try {
    return json(await getSettingsGroup(params.group as SettingGroup));
  } catch (error) {
    console.error('Error loading settings:', error);
    return json({ message: 'Failed to load settings' }, 500);
  }
};

export const PUT: APIRoute = async ({ params, locals, request }) => {
  const denied = await authorize(locals, params.group);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'Request body must be JSON' }, 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ message: 'Request body must be an object of settings' }, 400);
  }

  try {
    const result = await updateSettingsGroup(params.group as SettingGroup, body as Record<string, unknown>, locals.user!.id);

    if (!result.success) {
      return json({ message: 'Some settings are invalid', errors: result.errors }, 422);
    }

    return json({ message: 'Settings saved', settings: await getSettingsGroup(params.group as SettingGroup) });
  } catch (error) {
    console.error('Error saving settings:', error);
    return json({ message: 'Failed to save settings' }, 500);
  }
};

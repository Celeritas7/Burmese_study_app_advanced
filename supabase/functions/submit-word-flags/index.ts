// Code preparation only: DO NOT deploy until the reviewed migration, provider
// redirect configuration, and Android/iPad staging acceptance are approved.
// Supabase's withSupabase wrapper verifies JWTs and handles CORS preflights.
import { withSupabase } from 'npm:@supabase/server@1.9.1';
import { handleFlagRequest, receiveOnce } from './receiver.mjs';

const TABLE = 'burmese_app_word_issue_reports';
const OFFLINE_ORIGIN = 'https://burmese-study-offline.pages.dev';

function originAllowlist() {
  // Optional exact test origins; never expose a '*' wildcard here.
  const configured = (Deno.env.get('FLAG_SUBMISSION_ALLOWED_ORIGINS') || '')
    .split(',').map(origin => origin.trim()).filter(Boolean);
  return [OFFLINE_ORIGIN, ...configured];
}

function repository(supabaseAdmin: any) {
  return {
    async find(ownerId: string, clientId: string) {
      const { data, error } = await supabaseAdmin.from(TABLE)
        .select('id, received_at, payload_sha256').eq('owner_user_id', ownerId)
        .eq('client_flag_id', clientId).maybeSingle();
      if (error) throw error;
      return data;
    },
    async countSince(ownerId: string, since: string) {
      const { count, error } = await supabaseAdmin.from(TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', ownerId).gte('received_at', since);
      if (error || count == null) throw error || new Error('Could not check report quota.');
      return count;
    },
    async insertIfAbsent(ownerId: string, report: Record<string, unknown>, payloadHash: string) {
      const { data, error } = await supabaseAdmin.from(TABLE)
        .upsert({ ...report, payload_sha256: payloadHash, owner_user_id: ownerId }, {
          onConflict: 'owner_user_id,client_flag_id', ignoreDuplicates: true
        }).select('id, received_at, payload_sha256').maybeSingle();
      if (error) throw error;
      return data;
    }
  };
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, ctx) => {
    // Auth claims and Google provider verification are server-derived.
    // A password or anonymous session alone does not grant report delivery.
    const { data, error } = await ctx.supabase.auth.getUser();
    const user = error ? null : data?.user;
    const providers = user?.app_metadata?.providers;
    const googleVerified = Boolean(user && !user.is_anonymous && (
      (Array.isArray(providers) && providers.includes('google')) ||
      user.app_metadata?.provider === 'google'
    ));
    const ownerId = user?.id === ctx.userClaims?.id ? user.id : null;
    return handleFlagRequest(request, {
      ownerId,
      googleVerified,
      allowedOrigins: originAllowlist(),
      receive: (id: string, report: Record<string, unknown>) =>
        receiveOnce(repository(ctx.supabaseAdmin), id, report)
    });
  })
};

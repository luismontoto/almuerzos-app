// Genera enlaces de invitación (o de acceso, si el usuario ya existe) SIN enviar correos.
// Uso: SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env scripts/invite.mjs amigo@correo.com otro@correo.com
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const site = process.env.SITE_URL ?? 'http://localhost:5173'
const emails = process.argv.slice(2)

if (!url || !key || emails.length === 0) {
  console.error('Faltan datos. Uso: SUPABASE_SERVICE_ROLE_KEY=... node --env-file=.env scripts/invite.mjs email1 [email2 ...]')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

for (const email of emails) {
  let { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: site } })
  if (error) {
    ;({ data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: site } }))
  }
  console.log(error ? `${email}: ERROR ${error.message}\n` : `${email}\n${data.properties.action_link}\n`)
}

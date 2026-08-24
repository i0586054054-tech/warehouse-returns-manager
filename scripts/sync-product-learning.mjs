import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs/promises'

const rawUrl = String(process.env.SUPABASE_URL || '').trim()
const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
if (!rawUrl || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

// Accept either the plain project URL or an accidentally copied REST endpoint.
// supabase-js expects only https://<project-ref>.supabase.co
const url = rawUrl
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/i, '')
  .replace(/\/rest$/i, '')

if (!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(url)) {
  throw new Error(`SUPABASE_URL must be the project URL only (https://<project-ref>.supabase.co). Received an invalid value.`)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 1 } }
})
const data = JSON.parse(await fs.readFile('data/product_learning.json', 'utf8'))

for (const item of data.products || []) {
  const barcode = String(item.barcode || '').trim()
  const name = String(item.name || '').trim()
  const companyName = String(item.company || '').trim()
  const qty = Number(item.quantity || 0)
  if (!barcode || !name || !companyName) continue

  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id,name,return_method')
    .ilike('name', `%${companyName}%`)
    .limit(1)
  if (companyError) throw companyError
  const company = companies?.[0]
  if (!company) {
    console.warn(`Company not found: ${companyName}`)
    continue
  }

  const treatment = company.return_method === 'agent' ? 'agent' : 'whatsapp'
  const status = company.return_method === 'agent' ? 'waiting_agent' : 'pending_whatsapp'

  const { data: existingCatalog, error: catalogFindError } = await supabase
    .from('product_catalog')
    .select('id')
    .or(`barcode.eq.${barcode},item_code.eq.${barcode}`)
    .limit(1)
  if (catalogFindError) throw catalogFindError

  if (existingCatalog?.[0]?.id) {
    const { error } = await supabase
      .from('product_catalog')
      .update({ barcode, item_code: barcode, product_name: name, supplier_name: company.name })
      .eq('id', existingCatalog[0].id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('product_catalog')
      .insert({ barcode, item_code: barcode, product_name: name, supplier_name: company.name })
    if (error) throw error
  }

  const marker = `chat-sync:${barcode}`
  const { data: existingRows, error: productFindError } = await supabase
    .from('products')
    .select('id')
    .eq('notes', marker)
    .limit(1)
  if (productFindError) throw productFindError

  const row = {
    sku: barcode,
    name,
    qty,
    supplier: company.name,
    company_id: company.id,
    treatment_type: treatment,
    status,
    notes: marker
  }

  if (existingRows?.[0]?.id) {
    const { error } = await supabase.from('products').update(row).eq('id', existingRows[0].id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('products').insert(row)
    if (error) throw error
  }

  console.log(`Synced ${barcode} — ${name} — ${qty}`)
}

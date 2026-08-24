import { createClient } from '@supabase/supabase-js'
import learned from '../data/product_learning.json'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null

const norm=v=>String(v||'').toLowerCase().replace(/["'׳״().-]/g,' ').replace(/בע\s*מ/g,' ').replace(/\s+/g,' ').trim()

async function syncLearnedProducts(){
  if(!supabase||!learned?.products?.length)return
  const [{data:companies,error:ce},{data:agents,error:ae}]=await Promise.all([
    supabase.from('companies').select('*'),
    supabase.from('agents').select('*')
  ])
  if(ce)return
  const agentList=ae?[]:(agents||[])
  for(const item of learned.products){
    try{
      const company=(companies||[]).find(c=>norm(c.name)===norm(item.company))||(companies||[]).find(c=>norm(c.name).includes(norm(item.company))||norm(item.company).includes(norm(c.name)))
      if(!company)continue
      await supabase.from('product_catalog').upsert({
        item_code:item.barcode,
        barcode:item.barcode,
        product_name:item.name,
        supplier_name:company.name
      },{onConflict:'item_code'})
      const {data:existing}=await supabase.from('products').select('*').eq('sku',item.barcode).not('status','in','(completed,collected)').order('created_at',{ascending:true})
      const marker=`learning_sync_revision=${Number(item.sync_revision)||1}`
      const first=existing?.[0]
      const alreadySynced=first?.notes?.includes(marker)
      const treatment=company.return_method==='agent'?'agent':'whatsapp'
      const status=company.return_method==='agent'?'waiting_agent':'pending_whatsapp'
      const agent=company.return_method==='agent'?agentList.find(a=>a.company_id===company.id):null
      if(first){
        if(!alreadySynced){
          const notes=[first.notes,marker].filter(Boolean).join(' | ')
          await supabase.from('products').update({
            name:item.name,
            qty:Number(item.quantity)||1,
            supplier:company.name,
            company_id:company.id,
            treatment_type:treatment,
            agent_id:agent?.id||null,
            notes
          }).eq('id',first.id)
        }
      }else{
        await supabase.from('products').insert({
          sku:item.barcode,
          name:item.name,
          qty:Number(item.quantity)||1,
          supplier:company.name,
          company_id:company.id,
          treatment_type:treatment,
          agent_id:agent?.id||null,
          status,
          notes:`נקלט ממאגר הלמידה | ${marker}`
        })
      }
    }catch(err){
      console.warn('learned product sync failed',item?.barcode,err)
    }
  }
}

if(supabase){
  supabase.auth.getSession().then(({data})=>{if(data?.session)setTimeout(syncLearnedProducts,0)})
  supabase.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(syncLearnedProducts,0)})
}

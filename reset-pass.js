import { createClient } from '@supabase/supabase-js'

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'TU_SERVICE_ROLE_KEY') {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada en .env')
  process.exit(1)
}

const supabase = createClient(
  'https://fcrmykzlwfyxgepiygbo.supabase.co',
  SERVICE_ROLE_KEY
)

async function main() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '22222222-2222-2222-2222-222222222222',
    { password: 'regente123' }
  )

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  } else {
    console.log('✅ Contraseña actualizada correctamente')
  }
}

main()

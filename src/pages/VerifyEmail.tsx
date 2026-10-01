import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Token de confirmação não fornecido.')
      setLoading(false)
      return
    }

    pb.collection('users')
      .confirmVerification(token)
      .then(() => {
        setSuccess(true)
      })
      .catch((err: any) => {
        setError(err?.message || 'Token de verificação inválido ou expirado.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-6 sm:p-8 shadow-xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#8BC34A] to-[#689F38] flex items-center justify-center text-white shadow-md">
          <Sparkles className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-black text-[#3E2723] mb-2">Verificação de Conta</h1>

        {loading && (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#8BC34A] animate-spin" />
            <p className="text-xs font-bold text-[#795548]">
              Confirmando seu e-mail no servidor...
            </p>
          </div>
        )}

        {!loading && success && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-[#3E2723]">E-mail confirmado com sucesso!</p>
            <p className="text-xs text-[#795548]">
              Sua conta agora está totalmente verificada e pronta para acumular conquistas.
            </p>
            <Link to="/" className="inline-block w-full pt-2">
              <Button className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black py-5 rounded-xl">
                Ir para o Hub
              </Button>
            </Link>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-red-700">{error}</p>
            <Link to="/" className="inline-block w-full pt-2">
              <Button variant="outline" className="w-full border-[#3E2723]/20 font-bold rounded-xl">
                Voltar para o Início
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

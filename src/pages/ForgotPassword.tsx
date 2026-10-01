import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await pb.collection('users').requestPasswordReset(email)
      setSent(true)
    } catch (err: any) {
      setError(err?.message || 'Não foi possível solicitar a recuperação. Verifique o e-mail.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-100 flex items-center justify-center text-[#FFB74D] shadow-md">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-[#3E2723]">Recuperar Senha</h1>
          <p className="text-xs sm:text-sm text-[#795548] mt-1 font-bold">
            Informe o e-mail cadastrado para enviarmos as instruções de redefinição.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-[#3E2723]">
              Instruções enviadas com sucesso para{' '}
              <span className="font-black text-[#5E35B1]">{email}</span>.
            </p>
            <p className="text-xs text-[#795548]">
              Verifique sua caixa de entrada e spam para redefinir sua senha.
            </p>
            <Link to="/" className="inline-block mt-4">
              <Button className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-xl">
                Voltar para o Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                {error}
              </div>
            )}

            <div>
              <Label className="text-xs font-black text-[#3E2723] uppercase">
                Seu E-mail Cadastrado
              </Label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 text-[#795548] absolute left-3 top-3.5" />
                <Input
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-white border-[#3E2723]/20 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-sm py-5 rounded-2xl shadow-md"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Enviar E-mail de Recuperação'
              )}
            </Button>

            <div className="pt-2 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#795548] hover:text-[#3E2723]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Início
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

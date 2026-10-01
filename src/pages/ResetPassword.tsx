import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, ShieldCheck, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('Token de recuperação inválido ou ausente na URL.')
      return
    }

    if (password.length < 8) {
      setError('A nova senha deve ter pelo menos 8 dígitos.')
      return
    }

    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'Erro ao redefinir a senha. O link pode ter expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-purple-100 flex items-center justify-center text-[#5E35B1] shadow-md">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-[#3E2723]">Redefinir Senha</h1>
          <p className="text-xs sm:text-sm text-[#795548] mt-1 font-bold">
            Defina sua nova chave de acesso ao jogo.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-[#3E2723]">Senha alterada com sucesso!</p>
            <p className="text-xs text-[#795548]">
              Você já pode fazer login com suas novas credenciais.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-xl w-full"
            >
              Ir para o Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                {error}
              </div>
            )}

            <div>
              <Label className="text-xs font-black text-[#3E2723] uppercase">Nova Senha</Label>
              <div className="relative mt-1">
                <KeyRound className="w-4 h-4 text-[#795548] absolute left-3 top-3.5" />
                <Input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-white border-[#3E2723]/20 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-black text-[#3E2723] uppercase">
                Confirmar Nova Senha
              </Label>
              <div className="relative mt-1">
                <ShieldCheck className="w-4 h-4 text-[#795548] absolute left-3 top-3.5" />
                <Input
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="pl-9 bg-white border-[#3E2723]/20 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black text-sm py-5 rounded-2xl shadow-md"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Nova Senha'}
            </Button>

            <div className="pt-2 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#795548] hover:text-[#3E2723]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '@/context/GameContext'
import { AuthGate } from '@/components/AuthGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  ArrowLeft,
  Trophy,
  Flame,
  Check,
  TrendingUp,
  Award,
} from 'lucide-react'
import {
  METRIC_SUGGESTIONS,
  type PlayerObjectiveRecord,
  type ObjectiveMetricType,
} from '@/types/game'
import {
  fetchPlayerObjectives,
  createPlayerObjective,
  updatePlayerObjective,
  deletePlayerObjective,
} from '@/services/player'

export function Objetivos() {
  const { player, addReward, refreshPlayer } = useGame()
  const [objectives, setObjectives] = useState<PlayerObjectiveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Form State for creating a new objective
  const [title, setTitle] = useState('')
  const [metricType, setMetricType] = useState<ObjectiveMetricType>('custom')
  const [targetValue, setTargetValue] = useState<number>(10)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load objectives from PocketBase
  useEffect(() => {
    let mounted = true
    async function load() {
      if (!player?.id) return
      setLoading(true)
      try {
        const list = await fetchPlayerObjectives(player.id)
        if (mounted) setObjectives(list)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [player?.id])

  // Helper to calculate progress for a given objective
  const getObjectiveProgress = (obj: PlayerObjectiveRecord) => {
    if (obj.completed)
      return {
        current: obj.target_value || 1,
        target: obj.target_value || 1,
        percent: 100,
        isAutoCompleted: true,
      }
    if (!player)
      return { current: 0, target: obj.target_value || 1, percent: 0, isAutoCompleted: false }

    const suggestion = METRIC_SUGGESTIONS.find((s) => s.metric === obj.metric_type)
    if (!suggestion || !obj.target_value || obj.target_value <= 0) {
      return {
        current: obj.completed ? 1 : 0,
        target: 1,
        percent: obj.completed ? 100 : 0,
        isAutoCompleted: false,
      }
    }

    const current = suggestion.getCurrentValue(player)
    const target = obj.target_value
    const percent = Math.min(100, Math.round((current / target) * 100))
    return {
      current,
      target,
      percent,
      isAutoCompleted: current >= target,
    }
  }

  // Create new personal objective
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!player?.id) return
    if (!title.trim()) {
      toast({
        title: 'Nome Obrigatório',
        description: 'Digite o título do seu objetivo pessoal!',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const created = await createPlayerObjective({
        player: player.id,
        title: title.trim(),
        metric_type: metricType,
        target_value: metricType !== 'custom' ? targetValue : undefined,
        notes: notes.trim(),
        completed: false,
      })

      setObjectives((prev) => [created, ...prev])
      setModalOpen(false)
      setTitle('')
      setMetricType('custom')
      setNotes('')
      toast({
        title: '🎯 Objetivo Criado!',
        description: 'Sua meta foi salva e acompanhará seu progresso.',
        className: 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold',
      })
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível cadastrar o objetivo. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle completed state
  const handleToggle = async (obj: PlayerObjectiveRecord) => {
    const nextCompleted = !obj.completed
    try {
      const updated = await updatePlayerObjective(obj.id, {
        completed: nextCompleted,
      })

      setObjectives((prev) =>
        prev.map((item) => (item.id === obj.id ? { ...item, completed: nextCompleted } : item)),
      )

      if (nextCompleted) {
        addReward(25, 30, `Meta Concluída: ${obj.title}! 🏆`)
        toast({
          title: '🏆 Parabéns! Meta Concluída!',
          description: `Você completou "${obj.title}" e ganhou +25 XP e +30 Moedas!`,
          className: 'bg-amber-50 border-amber-300 text-amber-950 font-black',
        })
      }
      refreshPlayer()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao Atualizar',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // Delete an objective
  const handleDelete = async (id: string) => {
    try {
      await deletePlayerObjective(id)
      setObjectives((prev) => prev.filter((item) => item.id !== id))
      toast({
        title: 'Objetivo Removido',
        description: 'O objetivo foi excluído com sucesso.',
      })
    } catch (err) {
      console.error(err)
    }
  }

  // Stats summary
  const completedCount = useMemo(() => objectives.filter((o) => o.completed).length, [objectives])
  const totalCount = objectives.length
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <AuthGate>
      <div className="space-y-4 pb-12 animate-fade-in max-w-5xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFF9F0] border-2 border-[#3E2723]/10 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                variant="outline"
                size="icon"
                className="rounded-2xl border-[#3E2723]/20 hover:bg-amber-100/50"
              >
                <ArrowLeft className="w-5 h-5 text-[#3E2723]" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#3E2723] flex items-center gap-2">
                <Target className="w-6 h-6 text-amber-600" />
                Meus Objetivos
              </h1>
              <p className="text-xs sm:text-sm text-[#795548] font-bold">
                Defina suas metas pessoais e acompanhe seu crescimento no jogo
              </p>
            </div>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-2xl shadow-md flex items-center gap-2 text-sm px-4 py-2.5 h-auto self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Objetivo</span>
          </Button>
        </div>

        {/* Progress Overview Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4 sm:p-5 rounded-3xl shadow-md flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-100">
                Total de Metas
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-0.5">{totalCount}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
              🎯
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 sm:p-5 rounded-3xl shadow-md flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                Concluídos
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-0.5">
                {completedCount}{' '}
                <span className="text-sm font-normal text-emerald-100">/ {totalCount}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
              🏆
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 sm:p-5 rounded-3xl shadow-md flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-100">
                Taxa de Sucesso
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-0.5">{overallPercent}%</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
              ⭐
            </div>
          </div>
        </div>

        {/* Quick Suggested Metrics Banner */}
        <div className="bg-[#FFF9F0] border-2 border-[#FFB74D]/40 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#3E2723]">
                Sugestões Rápidas de Metas (Baseadas no seu Perfil)
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Clique para adicionar
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {METRIC_SUGGESTIONS.slice(0, 4).map((sugg) => {
              const cur = player ? sugg.getCurrentValue(player) : 0
              const nextTarget =
                sugg.suggestedTargets.find((t) => t > cur) ||
                sugg.suggestedTargets[sugg.suggestedTargets.length - 1]

              return (
                <button
                  key={sugg.metric}
                  type="button"
                  onClick={() => {
                    setTitle(`${sugg.label} (${nextTarget} ${sugg.unit})`)
                    setMetricType(sugg.metric)
                    setTargetValue(nextTarget)
                    setModalOpen(true)
                  }}
                  className="p-3 bg-white hover:bg-amber-50/70 border-2 border-[#3E2723]/10 hover:border-amber-400 rounded-2xl text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{sugg.icon}</span>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                      + Criar
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-black text-[#3E2723] leading-tight line-clamp-1">
                      {sugg.label}
                    </div>
                    <div className="text-[11px] font-bold text-[#795548] mt-0.5">
                      Meta: {nextTarget} {sugg.unit}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Objectives List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-black text-[#3E2723] flex items-center gap-2">
              <span>📋</span> Lista de Objetivos
            </h2>
            <span className="text-xs text-[#795548] font-bold">
              {objectives.length} cadastrado{objectives.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center bg-[#FFF9F0] rounded-3xl border-2 border-[#3E2723]/10 text-[#795548] font-bold">
              Carregando seus objetivos...
            </div>
          ) : objectives.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-[#FFF9F0] rounded-3xl border-2 border-dashed border-[#3E2723]/20 space-y-3">
              <span className="text-5xl block animate-bounce">🎯</span>
              <h3 className="text-lg font-black text-[#3E2723]">
                Você ainda não tem objetivos cadastrados!
              </h3>
              <p className="text-xs sm:text-sm text-[#795548] max-w-md mx-auto">
                Crie sua primeira meta (ex: "Alcançar nível 10", "Juntar 500 moedas", "Plantar 100
                sojas") ou defina um objetivo livre em texto.
              </p>
              <Button
                onClick={() => setModalOpen(true)}
                className="bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-2xl shadow-md text-sm px-5 py-2.5"
              >
                Criar Meu Primeiro Objetivo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {objectives.map((obj) => {
                const { current, target, percent, isAutoCompleted } = getObjectiveProgress(obj)
                const isMetric = obj.metric_type && obj.metric_type !== 'custom'
                const metricMeta = METRIC_SUGGESTIONS.find((s) => s.metric === obj.metric_type)

                return (
                  <div
                    key={obj.id}
                    className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      obj.completed
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-xs opacity-90'
                        : isAutoCompleted && !obj.completed
                          ? 'bg-amber-50/80 border-amber-400 shadow-md ring-2 ring-amber-300'
                          : 'bg-white border-[#3E2723]/10 hover:border-[#8BC34A]/50 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggle(obj)}
                        className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                          obj.completed
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'border-2 border-stone-300 hover:border-amber-500 bg-white'
                        }`}
                      >
                        {obj.completed ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <Circle className="w-4 h-4 text-transparent" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`text-base font-black leading-snug break-words ${
                              obj.completed
                                ? 'line-through text-emerald-950 opacity-75'
                                : 'text-[#3E2723]'
                            }`}
                          >
                            {obj.title}
                          </h3>
                          {metricMeta && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 flex items-center gap-1">
                              <span>{metricMeta.icon}</span>
                              <span>Métrica Automática</span>
                            </span>
                          )}
                          {isAutoCompleted && !obj.completed && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 animate-pulse">
                              Pronto para Concluir! 🎉
                            </span>
                          )}
                        </div>

                        {obj.notes && (
                          <p className="text-xs text-[#795548] font-bold line-clamp-2">
                            {obj.notes}
                          </p>
                        )}

                        {/* Progress bar if metric-driven */}
                        {isMetric && (
                          <div className="space-y-1 pt-1 max-w-md">
                            <div className="flex justify-between text-xs font-bold text-[#795548]">
                              <span>
                                Progresso: <strong>{current}</strong> / {target} {metricMeta?.unit}
                              </span>
                              <span className="font-black text-[#2E7D32]">{percent}%</span>
                            </div>
                            <Progress value={percent} className="h-2 bg-stone-100" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 self-end sm:self-center shrink-0">
                      <Button
                        type="button"
                        onClick={() => handleToggle(obj)}
                        className={`text-xs font-black rounded-xl h-9 px-3 ${
                          obj.completed
                            ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                            : 'bg-[#8BC34A] hover:bg-[#7CB342] text-white shadow-xs'
                        }`}
                      >
                        {obj.completed ? 'Reabrir' : 'Concluir Meta'}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(obj.id)}
                        className="w-9 h-9 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Create Objective Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
            <div className="bg-[#FFF9F0] border-4 border-[#8BC34A] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#DCEDC8] flex items-center justify-center text-xl">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-[#3E2723]">
                      Criar Novo Objetivo
                    </h3>
                    <p className="text-xs text-[#795548] font-bold">
                      Defina sua meta para focar e evoluir
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-200 text-[#3E2723] font-black hover:bg-stone-300 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Metric Selector Tabs */}
                <div>
                  <label className="block text-xs font-black uppercase text-[#3E2723] mb-1.5">
                    Tipo de Objetivo:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetricType('custom')}
                      className={`p-2.5 rounded-xl border-2 text-xs font-black text-left transition-all ${
                        metricType === 'custom'
                          ? 'border-[#8BC34A] bg-[#F1F8E9] text-[#2E7D32] shadow-xs'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      ✍️ Texto Livre
                      <span className="block text-[10px] font-normal text-stone-500">
                        Objetivo livre pessoal
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (metricType === 'custom') setMetricType('level')
                      }}
                      className={`p-2.5 rounded-xl border-2 text-xs font-black text-left transition-all ${
                        metricType !== 'custom'
                          ? 'border-[#8BC34A] bg-[#F1F8E9] text-[#2E7D32] shadow-xs'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      📊 Métrica do Jogo
                      <span className="block text-[10px] font-normal text-stone-500">
                        Acompanha progresso auto
                      </span>
                    </button>
                  </div>
                </div>

                {/* If metric is selected, choose which metric */}
                {metricType !== 'custom' && (
                  <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-stone-200">
                    <label className="block text-xs font-black text-[#3E2723]">
                      Escolha a Métrica de Acompanhamento:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {METRIC_SUGGESTIONS.map((sugg) => (
                        <button
                          key={sugg.metric}
                          type="button"
                          onClick={() => {
                            setMetricType(sugg.metric)
                            if (!title || METRIC_SUGGESTIONS.some((m) => title.includes(m.label))) {
                              setTitle(`${sugg.label} (${sugg.suggestedTargets[0]} ${sugg.unit})`)
                            }
                            setTargetValue(sugg.suggestedTargets[0])
                          }}
                          className={`p-2 rounded-xl border text-xs font-black flex items-center gap-2 text-left ${
                            metricType === sugg.metric
                              ? 'border-[#8BC34A] bg-[#F1F8E9] text-[#2E7D32]'
                              : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <span className="text-lg">{sugg.icon}</span>
                          <span className="truncate">{sugg.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-black text-[#3E2723] mb-1">
                        Valor Alvo a Atingir:
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={targetValue}
                        onChange={(e) => setTargetValue(Number(e.target.value) || 0)}
                        className="bg-stone-50 rounded-xl font-black text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-black uppercase text-[#3E2723] mb-1">
                    Título do Objetivo:
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Chegar ao nível 10, Juntar 500 moedas..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-white rounded-xl border-stone-300 font-bold"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-black uppercase text-[#3E2723] mb-1">
                    Anotações ou Motivação (Opcional):
                  </label>
                  <Textarea
                    placeholder="Ex: Vou focar na produção de pão para conseguir mais rápido..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="bg-white rounded-xl border-stone-300 text-xs font-bold"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 rounded-2xl font-black border-stone-300 text-xs h-11"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#8BC34A] hover:bg-[#7CB342] text-white font-black rounded-2xl text-xs h-11 shadow-md"
                  >
                    {submitting ? 'Salvando...' : 'Salvar Objetivo 🎯'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}

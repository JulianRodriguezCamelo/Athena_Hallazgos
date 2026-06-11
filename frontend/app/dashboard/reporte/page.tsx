'use client'

import { useEffect } from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAuth } from '@/lib/auth'
import { PageLoader } from '@/components/ui/Spinner'

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-gray-300 rounded p-4 text-center print:border-gray-400">
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500 border-b border-gray-300 pb-1 mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function ReporteEjecutivoPage() {
  const { user } = useAuth()
  const { metrics, porEstado, porDependencia, porResponsable, porEstadoPlan, loading } = useDashboardData()

  const hoy = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  const mes = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  useEffect(() => {
    document.title = `Reporte ERO — ${mes}`
    return () => { document.title = 'Hallazgos ERO' }
  }, [mes])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <PageLoader />
    </div>
  )

  const total = metrics?.total_hallazgos ?? 0
  const cerradas = metrics?.cerradas ?? 0
  const abiertas = metrics?.abiertas ?? 0
  const vencidos = metrics?.vencidos ?? 0
  const conProrroga = metrics?.con_prorroga ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const top5Responsables = [...porResponsable].sort((a, b) => b.value - a.value).slice(0, 5)
  const top5Dependencias = [...porDependencia].sort((a, b) => b.value - a.value).slice(0, 5)

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Barra de acciones — solo visible en pantalla, oculta al imprimir */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al dashboard
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Guardar como PDF
        </button>
      </div>

      {/* Contenido del reporte */}
      <div className="max-w-4xl mx-auto px-8 py-10 print:px-6 print:py-8">

        {/* Encabezado */}
        <div className="flex items-start justify-between mb-10 pb-6 border-b-2 border-gray-900">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Fiduprevisora S.A.</p>
            <h1 className="text-2xl font-bold text-gray-900">Reporte Ejecutivo de Hallazgos ERO</h1>
            <p className="text-sm text-gray-500 mt-1">Período: {mes}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Generado el {hoy}</p>
            {user && <p className="mt-0.5">Por: {user.nombre}</p>}
          </div>
        </div>

        {/* KPIs principales */}
        <Section title="Resumen ejecutivo">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Kpi label="Total hallazgos" value={total} />
            <Kpi label="Cerrados" value={cerradas} sub={`${cumplimiento}% de cumplimiento`} />
            <Kpi label="Abiertos" value={abiertas} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Kpi label="Vencidos" value={vencidos} sub="Sin cerrar" />
            <Kpi label="Con prórroga" value={conProrroga} />
            <Kpi label="% Cumplimiento" value={`${cumplimiento}%`} />
          </div>
        </Section>

        {/* Estado de hallazgos */}
        {porEstado.length > 0 && (
          <Section title="Distribución por estado">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-300">Estado</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 border border-gray-300">Cantidad</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 border border-gray-300">% del total</th>
                </tr>
              </thead>
              <tbody>
                {porEstado.map(e => (
                  <tr key={e.name} className="border-b border-gray-200">
                    <td className="px-3 py-2 border border-gray-300">{e.name || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium border border-gray-300">{e.value}</td>
                    <td className="px-3 py-2 text-right text-gray-500 border border-gray-300">
                      {total > 0 ? `${Math.round((e.value / total) * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Estado de planes */}
        {porEstadoPlan.length > 0 && (
          <Section title="Estado de planes de acción">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-300">Estado del plan</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 border border-gray-300">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {porEstadoPlan.map(e => (
                  <tr key={e.name} className="border-b border-gray-200">
                    <td className="px-3 py-2 border border-gray-300">{e.name || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium border border-gray-300">{e.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Top responsables */}
        {top5Responsables.length > 0 && (
          <Section title="Responsables con más hallazgos (Top 5)">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-300">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-300">Responsable</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 border border-gray-300">Hallazgos</th>
                </tr>
              </thead>
              <tbody>
                {top5Responsables.map((r, i) => (
                  <tr key={r.name} className="border-b border-gray-200">
                    <td className="px-3 py-2 text-gray-400 border border-gray-300">{i + 1}</td>
                    <td className="px-3 py-2 border border-gray-300">{r.name || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium border border-gray-300">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Top dependencias */}
        {top5Dependencias.length > 0 && (
          <Section title="Dependencias con más hallazgos (Top 5)">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-300">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-300">Dependencia</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 border border-gray-300">Hallazgos</th>
                </tr>
              </thead>
              <tbody>
                {top5Dependencias.map((d, i) => (
                  <tr key={d.name} className="border-b border-gray-200">
                    <td className="px-3 py-2 text-gray-400 border border-gray-300">{i + 1}</td>
                    <td className="px-3 py-2 border border-gray-300">{d.name || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium border border-gray-300">{d.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Pie de página */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-xs text-gray-400 flex justify-between print:mt-16">
          <span>Hallazgos ERO — Fiduprevisora S.A. — Documento confidencial</span>
          <span>Generado el {hoy}</span>
        </div>

        {/* Espacio para firma — solo impresión */}
        <div className="hidden print:block mt-16">
          <div className="grid grid-cols-2 gap-16">
            <div className="border-t border-gray-400 pt-2 text-xs text-gray-500 text-center">Firma Vicepresidente</div>
            <div className="border-t border-gray-400 pt-2 text-xs text-gray-500 text-center">Firma Elaboró</div>
          </div>
        </div>

      </div>
    </div>
  )
}

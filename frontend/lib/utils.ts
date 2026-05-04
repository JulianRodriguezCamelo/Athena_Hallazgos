import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(value: string | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!value) return '—'
  try {
    return format(new Date(value), fmt, { locale: es })
  } catch {
    return value
  }
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, "dd/MM/yyyy HH:mm")
}

export const ESTADO_COLORS: Record<string, string> = {
  'Abierto':    'bg-amber-100 text-amber-800',
  'Cerrado':    'bg-green-100 text-green-800',
  'Vencido':    'bg-red-100 text-red-800',
  'En proceso': 'bg-blue-100 text-blue-800',
  'Prórroga':   'bg-purple-100 text-purple-800',
}

export function cleanText(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/_x000D_/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
}

export function getEstadoColor(estado: string | null | undefined): string {
  if (!estado) return 'bg-gray-100 text-gray-600'
  return ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-600'
}

export const ROL_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  vicepresidente: 'Vicepresidente',
  directivo: 'Directivo',
  profesional: 'Profesional',
  gestor: 'Gestor',
}

export const ROL_COLORS: Record<string, string> = {
  administrador: 'bg-rose-100 text-rose-700',
  vicepresidente: 'bg-primary/10 text-primary',
  directivo: 'bg-accent/10 text-accent',
  profesional: 'bg-muted text-muted-foreground',
  gestor: 'bg-green-100 text-green-700',
}

import { BedDouble, Bus, Receipt, ShoppingBasket, Ticket, UtensilsCrossed } from 'lucide-react'
import type { ExpenseCategory } from '../lib/expenses'

const ICONS = { repas: UtensilsCrossed, logement: BedDouble, transport: Bus, activites: Ticket, courses: ShoppingBasket, autre: Receipt }

/** Icône d'une catégorie de dépense */
export function CategoryIcon({ category, size = 18 }: { category: ExpenseCategory; size?: number }) {
  const Icon = ICONS[category] ?? Receipt
  return <Icon size={size} aria-hidden />
}

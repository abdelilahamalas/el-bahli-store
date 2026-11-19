import api from "@/services/api"
import type { Category, CategoriesApiResponse } from "@/types/category"
import { siteConfig } from "@/config/site"

export const categoryService = {
  /**
   * Récupère la liste officielle des catégories actives depuis l'API Laravel.
   * Trie automatiquement selon l'ordre officiel de la boutique.
   */
  async getCategories(): Promise<Category[]> {
    try {
      const response = await api.get<CategoriesApiResponse>("/categories")
      const rawCategories = response.data?.data || []

      // Tri selon l'ordre officiel
      const orderMap = new Map<string, number>()
      siteConfig.officialCategoriesOrder.forEach((slug, idx) => {
        orderMap.set(slug.toLowerCase(), idx)
      })

      return [...rawCategories].sort((a, b) => {
        const orderA = orderMap.has(a.slug.toLowerCase())
          ? (orderMap.get(a.slug.toLowerCase()) as number)
          : (a.sort_order ?? 999)
        const orderB = orderMap.has(b.slug.toLowerCase())
          ? (orderMap.get(b.slug.toLowerCase()) as number)
          : (b.sort_order ?? 999)
        return orderA - orderB
      })
    } catch (error) {
      console.error("Erreur lors de la récupération des catégories :", error)
      throw error
    }
  },

  /**
   * Récupère une catégorie par son slug.
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      const response = await api.get<{ success: boolean; data: Category }>(
        `/categories/${slug}`
      )
      return response.data?.data || null
    } catch (error) {
      console.error(`Erreur lors de la récupération de la catégorie ${slug} :`, error)
      return null
    }
  },
}

export default categoryService

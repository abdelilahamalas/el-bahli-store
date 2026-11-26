import api from "@/services/api"
import type {
  Product,
  ProductFilterParams,
  ProductsApiResponse,
  ProductDetailApiResponse,
  CategoryProductsApiResponse,
  PaginationMeta,
} from "@/types/product"
import type { Category } from "@/types/category"

export const productService = {
  /**
   * Récupère la liste des produits actifs du catalogue avec filtres, recherche et pagination.
   */
  async getProducts(params?: ProductFilterParams, signal?: AbortSignal): Promise<{
    products: Product[]
    pagination: PaginationMeta
  }> {
    try {
      const response = await api.get<ProductsApiResponse>("/products", {
        signal,
        params: {
          page: params?.page ?? 1,
          per_page: params?.per_page ?? 12,
          category_id: params?.category_id,
          category_slug: params?.category_slug,
          search: params?.search,
          min_price: params?.min_price,
          max_price: params?.max_price,
          sort: params?.sort ?? "latest",
        },
      })

      const data = response.data?.data
      return {
        products: data?.data ?? [],
        pagination: data?.pagination ?? {
          current_page: 1,
          last_page: 1,
          per_page: 12,
          total: 0,
        },
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des produits :", error)
      throw error
    }
  },

  /**
   * Récupère la fiche détaillée d'un produit actif par son slug.
   */
  async getProductBySlug(slug: string): Promise<Product> {
    try {
      const response = await api.get<ProductDetailApiResponse>(`/products/${slug}`)
      if (!response.data?.data) {
        throw new Error("Produit introuvable")
      }
      return response.data.data
    } catch (error) {
      console.error(`Erreur lors de la récupération du produit ${slug} :`, error)
      throw error
    }
  },

  /**
   * Récupère les produits actifs d'une catégorie spécifique.
   */
  async getProductsByCategory(
    categorySlug: string,
    params?: ProductFilterParams
  ): Promise<{
    category: Category
    products: Product[]
    pagination: PaginationMeta
  }> {
    try {
      const response = await api.get<CategoryProductsApiResponse>(
        `/categories/${categorySlug}/products`,
        {
          params: {
            page: params?.page ?? 1,
            per_page: params?.per_page ?? 12,
          },
        }
      )

      const payload = response.data?.data
      return {
        category: payload.category as Category,
        products: payload.products?.data ?? [],
        pagination: payload.products?.pagination ?? {
          current_page: 1,
          last_page: 1,
          per_page: 12,
          total: 0,
        },
      }
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des produits de la catégorie ${categorySlug} :`,
        error
      )
      throw error
    }
  },
}

export default productService

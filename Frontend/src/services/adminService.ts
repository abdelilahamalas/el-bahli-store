import api from "./api"
import type { ApiResponse, PaginationMeta } from "@/types/api"
import type {
  AdminUser,
  AdminLoginResponse,
  AdminDashboardData,
  AdminProduct,
  AdminProductVariant,
  UpdateProductPayload,
  AdminOrder,
  AdminOrderDetailResponse,
  InventoryItem,
  InventoryStats,
  StockMovementItem,
  AdminCategory,
  StoreSettings,
} from "@/types/admin"

export const adminService = {
  // --------------------------------------------------------------------------
  // Authentification
  // --------------------------------------------------------------------------
  async login(credentials: { email: string; password: string; remember?: boolean }): Promise<AdminLoginResponse> {
    const response = await api.post<ApiResponse<AdminLoginResponse>>("/admin/login", credentials)
    return response.data.data
  },

  async logout(): Promise<void> {
    await api.post("/admin/logout")
  },

  async getMe(): Promise<AdminUser> {
    const response = await api.get<ApiResponse<AdminUser>>("/admin/me")
    return response.data.data
  },

  // --------------------------------------------------------------------------
  // Tableau de bord
  // --------------------------------------------------------------------------
  async getDashboardStats(period = "all"): Promise<AdminDashboardData> {
    const response = await api.get<ApiResponse<AdminDashboardData>>("/admin/dashboard", {
      params: { period },
    })
    return response.data.data
  },

  // --------------------------------------------------------------------------
  // Produits
  // --------------------------------------------------------------------------
  async getProducts(params?: {
    category_id?: number | string
    is_active?: boolean | string
    search?: string
    per_page?: number
    page?: number
  }): Promise<{ products: AdminProduct[]; pagination: PaginationMeta }> {
    const response = await api.get<
      ApiResponse<{ data: AdminProduct[]; pagination: PaginationMeta }>
    >("/admin/products", { params })
    return {
      products: response.data.data.data,
      pagination: response.data.data.pagination,
    }
  },

  async getProduct(id: number | string): Promise<AdminProduct> {
    const response = await api.get<ApiResponse<AdminProduct>>(`/admin/products/${id}`)
    return response.data.data
  },

  async createProduct(formData: FormData): Promise<AdminProduct> {
    const response = await api.post<ApiResponse<AdminProduct>>("/admin/products", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data.data
  },

  async updateProduct(id: number | string, data: UpdateProductPayload): Promise<AdminProduct> {
    const response = await api.put<ApiResponse<AdminProduct>>(`/admin/products/${id}`, data)
    return response.data.data
  },

  async deleteProduct(id: number | string): Promise<{ success: boolean; message?: string; data?: any }> {
    const response = await api.delete<ApiResponse<any>>(`/admin/products/${id}`)
    return response.data
  },

  async toggleProduct(id: number | string): Promise<{ is_active: boolean }> {
    const response = await api.patch<ApiResponse<{ is_active: boolean }>>(
      `/admin/products/${id}/toggle`
    )
    return response.data.data
  },

  async uploadProductImage(
    productId: number | string,
    file: File,
    isMain = false
  ): Promise<AdminProduct> {
    const formData = new FormData()
    formData.append("image", file)
    if (isMain) {
      formData.append("is_main", "1")
    }
    const response = await api.post<ApiResponse<AdminProduct>>(
      `/admin/products/${productId}/images`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
    return response.data.data
  },

  async uploadProductImages(
    productId: number | string,
    files: File[]
  ): Promise<AdminProduct> {
    let updatedProduct: AdminProduct | null = null
    for (const file of files) {
      const formData = new FormData()
      formData.append("image", file)
      const res = await api.post<ApiResponse<AdminProduct>>(
        `/admin/products/${productId}/images`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      updatedProduct = res.data.data
    }
    if (!updatedProduct) {
      throw new Error("Aucun fichier à uploader.")
    }
    return updatedProduct
  },

  async setMainProductImage(productId: number | string, imageId: number | string): Promise<AdminProduct> {
    const response = await api.post<ApiResponse<AdminProduct>>(`/admin/products/${productId}/images/${imageId}/main`)
    return response.data.data
  },

  async deleteProductImage(productId: number | string, imageId: number | string): Promise<AdminProduct> {
    const response = await api.delete<ApiResponse<AdminProduct>>(`/admin/products/${productId}/images/${imageId}`)
    return response.data.data
  },

  async addVariant(
    productId: number | string,
    variant: { size: string; color: string; stock: number; is_active?: boolean }
  ): Promise<AdminProductVariant> {
    const response = await api.post<ApiResponse<AdminProductVariant>>(
      `/admin/products/${productId}/variants`,
      variant
    )
    return response.data.data
  },

  async updateVariant(
    productId: number | string,
    variantId: number | string,
    variant: { size?: string; color?: string; stock?: number; is_active?: boolean }
  ): Promise<AdminProductVariant> {
    const response = await api.patch<ApiResponse<AdminProductVariant>>(
      `/admin/products/${productId}/variants/${variantId}`,
      variant
    )
    return response.data.data
  },

  // --------------------------------------------------------------------------
  // Commandes
  // --------------------------------------------------------------------------
  async getOrders(params?: {
    status?: string
    search?: string
    date_from?: string
    date_to?: string
    per_page?: number
    page?: number
    sort_by?: string
    sort_order?: string
  }): Promise<{
    orders: AdminOrder[]
    pagination: PaginationMeta
    statuses: { value: string; label: string }[]
  }> {
    const response = await api.get<
      ApiResponse<{
        data: AdminOrder[]
        pagination: PaginationMeta
        statuses: { value: string; label: string }[]
      }>
    >("/admin/orders", { params })
    return {
      orders: response.data.data.data,
      pagination: response.data.data.pagination,
      statuses: response.data.data.statuses,
    }
  },

  async getOrderDetail(id: number | string): Promise<AdminOrderDetailResponse> {
    const response = await api.get<ApiResponse<AdminOrderDetailResponse>>(`/admin/orders/${id}`)
    return response.data.data
  },

  async updateOrderStatus(
    id: number | string,
    status: string,
    reason?: string
  ): Promise<AdminOrder> {
    const response = await api.patch<ApiResponse<AdminOrder>>(`/admin/orders/${id}/status`, {
      status,
      reason,
    })
    return response.data.data
  },

  async updatePaymentStatus(id: number | string, payment_status: string): Promise<AdminOrder> {
    const response = await api.patch<ApiResponse<AdminOrder>>(`/admin/orders/${id}/payment`, {
      payment_status,
    })
    return response.data.data
  },

  async updateOrderNotes(id: number | string, admin_notes: string): Promise<AdminOrder> {
    const response = await api.patch<ApiResponse<AdminOrder>>(`/admin/orders/${id}/notes`, {
      admin_notes,
    })
    return response.data.data
  },

  // --------------------------------------------------------------------------
  // Inventaire
  // --------------------------------------------------------------------------
  async getInventory(params?: {
    category_id?: number | string
    stock_status?: string
    search?: string
    per_page?: number
    page?: number
  }): Promise<{
    inventory: { data: InventoryItem[]; pagination: PaginationMeta }
    stats: InventoryStats
    categories: AdminCategory[]
  }> {
    const response = await api.get<
      ApiResponse<{
        inventory: { data: InventoryItem[]; pagination: PaginationMeta }
        stats: InventoryStats
        categories: AdminCategory[]
      }>
    >("/admin/inventory", { params })
    return response.data.data
  },

  async adjustStock(
    variantId: number | string,
    newStock: number,
    reason?: string
  ): Promise<void> {
    await api.post(`/admin/inventory/variants/${variantId}/adjust`, {
      new_stock: newStock,
      reason,
    })
  },

  async toggleVariant(variantId: number | string): Promise<{ is_active: boolean }> {
    const response = await api.patch<ApiResponse<{ is_active: boolean }>>(
      `/admin/inventory/variants/${variantId}/toggle`
    )
    return response.data.data
  },

  async getStockMovements(params?: {
    variant_id?: number | string
    type?: string
    per_page?: number
    page?: number
  }): Promise<{ movements: StockMovementItem[]; pagination: PaginationMeta }> {
    const response = await api.get<
      ApiResponse<{ data: StockMovementItem[]; pagination: PaginationMeta }>
    >("/admin/inventory/movements", { params })
    return {
      movements: response.data.data.data,
      pagination: response.data.data.pagination,
    }
  },

  // --------------------------------------------------------------------------
  // Catégories
  // --------------------------------------------------------------------------
  async getCategories(): Promise<AdminCategory[]> {
    const response = await api.get<ApiResponse<AdminCategory[]>>("/admin/categories")
    return response.data.data
  },

  async createCategory(
    data: FormData | { name: string; sort_order?: number; is_active?: boolean }
  ): Promise<AdminCategory> {
    const isFormData = data instanceof FormData
    const response = await api.post<ApiResponse<AdminCategory>>("/admin/categories", data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    })
    return response.data.data
  },

  async updateCategory(
    id: number | string,
    data: FormData | { name: string; sort_order?: number; is_active?: boolean }
  ): Promise<AdminCategory> {
    const isFormData = data instanceof FormData
    const response = isFormData
      ? await api.post<ApiResponse<AdminCategory>>(`/admin/categories/${id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      : await api.put<ApiResponse<AdminCategory>>(`/admin/categories/${id}`, data)
    return response.data.data
  },

  async deleteCategory(id: number | string): Promise<void> {
    await api.delete(`/admin/categories/${id}`)
  },

  async toggleCategory(id: number | string): Promise<{ is_active: boolean }> {
    const response = await api.patch<ApiResponse<{ is_active: boolean }>>(
      `/admin/categories/${id}/toggle`
    )
    return response.data.data
  },

  // --------------------------------------------------------------------------
  // Paramètres
  // --------------------------------------------------------------------------
  async getSettings(): Promise<StoreSettings> {
    const response = await api.get<ApiResponse<StoreSettings>>("/admin/settings")
    return response.data.data
  },

  async updateSettings(data: Partial<StoreSettings>): Promise<StoreSettings> {
    const response = await api.put<ApiResponse<StoreSettings>>("/admin/settings", data)
    return response.data.data
  },
}

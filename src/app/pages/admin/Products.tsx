import { Card } from '../../components/ui/card'
import { useState, useEffect, useMemo } from 'react'
import {
  ImageIcon,
  Plus,
  Trash2,
  Pencil,
  FolderPlus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useStore } from '../../contexts/StoreContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select'
import { Product, Category } from '../../types'
import { toast } from 'sonner'
import { AdminShell } from '../../components/admin/AdminShell'

type UpgradeModalState = {
  open: boolean
  title: string
  description: string
  currentPlan: string
  suggestedPlans: string[]
}

type ProductExtraForm = {
  id: string
  name: string
  price: string
}

const SALES_WHATSAPP = '5582987227433'

function getHumanPlanName(plan?: string | null) {
  const normalized = String(plan || '').trim().toLowerCase()

  if (normalized === 'premium') return 'Premium'
  if (normalized === 'pro') return 'Pro'
  return 'Simples'
}

function getSuggestedPlans(plan?: string | null) {
  const normalized = String(plan || '').trim().toLowerCase()

  if (normalized === 'pro') return ['Premium']
  if (normalized === 'premium') return []
  return ['Pro', 'Premium']
}

function openUpgradeWhatsApp(params: {
  storeName?: string
  currentPlan?: string
  reason?: string
}) {
  const storeName = String(params.storeName || 'Minha loja').trim()
  const currentPlan = String(params.currentPlan || 'Simples').trim()
  const reason = String(params.reason || 'Atingi o limite do meu plano.').trim()

  const message = [
    'Olá! Tudo bem?',
    '',
    'Sou administrador de uma loja na plataforma e gostaria de solicitar um upgrade de plano.',
    '',
    `Loja: ${storeName}`,
    `Plano atual: ${currentPlan}`,
    `Motivo: ${reason}`,
    '',
    'Poderia me enviar as opções disponíveis para upgrade?',
    '',
    'Obrigado!'
  ].join('\n')

  const url = `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

function createEmptyExtra(): ProductExtraForm {
  return {
    id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    price: ''
  }
}

export function AdminProducts() {
  const navigate = useNavigate()
  const { user, authLoading } = useAuth()

  const {
    isLoaded,
    stores,
    getStore,
    getStoreByAdminEmail,
    getStoreProducts,
    getStoreCategories,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useStore()

  const [openProduct, setOpenProduct] = useState(false)
  const [openCategory, setOpenCategory] = useState(false)

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none')

  const [savingProduct, setSavingProduct] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({
    open: false,
    title: '',
    description: '',
    currentPlan: '',
    suggestedPlans: []
  })

  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productImage, setProductImage] = useState('')
  const [productExtras, setProductExtras] = useState<ProductExtraForm[]>([createEmptyExtra()])

  const [categoryName, setCategoryName] = useState('')

  useEffect(() => {
    if (authLoading) return

    setAuthChecked(true)

    if (!user || user.role !== 'admin') {
      navigate('/login', { replace: true })
    }
  }, [user, authLoading, navigate])

  const resolvedStore = useMemo(() => {
    if (!user || user.role !== 'admin') return undefined

    const directStore = user.storeId ? getStore(user.storeId) : undefined
    if (directStore) return directStore

    const byEmail = getStoreByAdminEmail(user.email)
    if (byEmail) return byEmail

    if (isLoaded && stores.length === 1) return stores[0]

    return undefined
  }, [user, isLoaded, stores, getStore, getStoreByAdminEmail])

  const products = resolvedStore ? getStoreProducts(resolvedStore.id) : []
  const categories = resolvedStore ? getStoreCategories(resolvedStore.id) : []

  useEffect(() => {
    if (!openProduct) return

    if (!editingProduct) {
      setProductName('')
      setProductDescription('')
      setProductPrice('')
      setProductImage('')
      setSelectedCategoryId('none')
      setProductExtras([createEmptyExtra()])
      return
    }

    setProductName(editingProduct.name || '')
    setProductDescription((editingProduct as any).description || '')
    setProductPrice(String(editingProduct.price ?? ''))
    setProductImage(editingProduct.image || '')
    setSelectedCategoryId(editingProduct.categoryId || 'none')

    const currentExtras = Array.isArray((editingProduct as any).extras)
      ? (editingProduct as any).extras
      : []

    setProductExtras(
      currentExtras.length > 0
        ? currentExtras.map((extra: any, index: number) => ({
            id: extra?.id || `extra-${Date.now()}-${index}`,
            name: String(extra?.name || ''),
            price: String(extra?.price ?? '')
          }))
        : [createEmptyExtra()]
    )
  }, [openProduct, editingProduct])

  useEffect(() => {
    if (!openCategory) return

    if (!editingCategory) {
      setCategoryName('')
      return
    }

    setCategoryName(editingCategory.name || '')
  }, [openCategory, editingCategory])

  if (authLoading || !authChecked || !isLoaded) {
    return <div className="p-6">Carregando catálogo...</div>
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  if (!resolvedStore) {
    return <div className="p-6">Loja não encontrada.</div>
  }

  const openUpgradeModalFromError = (message: string) => {
    const planName = getHumanPlanName((resolvedStore as any)?.plan)
    const suggestedPlans = getSuggestedPlans((resolvedStore as any)?.plan)

    setUpgradeModal({
      open: true,
      title: 'Limite do plano atingido',
      description: message,
      currentPlan: planName,
      suggestedPlans
    })
  }

  const resetProductForm = () => {
    setProductName('')
    setProductDescription('')
    setProductPrice('')
    setProductImage('')
    setProductExtras([createEmptyExtra()])
    setSelectedCategoryId('none')
    setEditingProduct(null)
  }

  const resetCategoryForm = () => {
    setCategoryName('')
    setEditingCategory(null)
  }

  const addExtraField = () => {
    setProductExtras((prev) => [...prev, createEmptyExtra()])
  }

  const updateExtraField = (
    id: string,
    field: keyof ProductExtraForm,
    value: string
  ) => {
    setProductExtras((prev) =>
      prev.map((extra) =>
        extra.id === id ? { ...extra, [field]: value } : extra
      )
    )
  }

  const removeExtraField = (id: string) => {
    setProductExtras((prev) => {
      const filtered = prev.filter((extra) => extra.id !== id)
      return filtered.length > 0 ? filtered : [createEmptyExtra()]
    })
  }

  const handleSubmitProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (savingProduct) return

    if (!isLoaded || !resolvedStore) {
      toast.error('Dados da loja ainda estão sendo carregados.')
      return
    }

    const name = productName.trim()
    const description = productDescription.trim()
    const priceRaw = productPrice.trim()
    const image = productImage.trim()

    const extras = productExtras
      .map((extra, index) => ({
        id: extra.id || `extra-${Date.now()}-${index}`,
        name: String(extra.name || '').trim(),
        price: Number(extra.price || 0)
      }))
      .filter((extra) => extra.name)

    if (!name) {
      toast.error('Informe o nome do produto.')
      return
    }

    if (!priceRaw || Number.isNaN(Number(priceRaw))) {
      toast.error('Informe um preço válido.')
      return
    }

    if (!image) {
      toast.error('Informe a URL da imagem.')
      return
    }

    setSavingProduct(true)

    try {
      const productData = {
        name,
        description,
        price: Number(priceRaw),
        image,
        extras,
        categoryId: selectedCategoryId === 'none' ? undefined : selectedCategoryId,
        storeId: resolvedStore.id,
        available: editingProduct?.available ?? true
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData)
        toast.success('Produto atualizado com sucesso!')
      } else {
        await addProduct({
          id: `product-${Date.now()}`,
          ...productData
        })

        toast.success('Produto adicionado com sucesso!')
      }

      setOpenProduct(false)
      resetProductForm()
    } catch (error: any) {
      const message = error?.message || 'Não foi possível salvar o produto.'

      if (
        String(message).toLowerCase().includes('limite') &&
        String(message).toLowerCase().includes('produto')
      ) {
        toast.error('Limite de produtos atingido')
        setOpenProduct(false)
        openUpgradeModalFromError(message)
        return
      }

      toast.error(message)
    } finally {
      setSavingProduct(false)
    }
  }

  const handleSubmitCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (savingCategory) return

    if (!resolvedStore) {
      toast.error('Loja não encontrada.')
      return
    }

    const name = categoryName.trim()

    if (!name) {
      toast.error('Informe o nome da categoria.')
      return
    }

    setSavingCategory(true)

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name,
          storeId: resolvedStore.id,
          order: editingCategory.order ?? 0
        })

        toast.success('Categoria atualizada com sucesso!')
      } else {
        await addCategory({
          id: `category-${Date.now()}`,
          name,
          storeId: resolvedStore.id,
          order: categories.length
        })

        toast.success('Categoria criada com sucesso!')
      }

      setOpenCategory(false)
      resetCategoryForm()
    } catch (error: any) {
      const message = error?.message || 'Não foi possível salvar a categoria.'
      toast.error(message)
    } finally {
      setSavingCategory(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return

    await deleteProduct(id)
    toast.success('Produto excluído')
  }

  const handleDeleteCategory = async (id: string) => {
    const hasProducts = products.some((product) => product.categoryId === id)

    if (hasProducts) {
      toast.error('Remova ou altere os produtos desta categoria antes de excluí-la.')
      return
    }

    if (!confirm('Deseja realmente excluir esta categoria?')) return

    await deleteCategory(id)
    toast.success('Categoria excluída')
  }

  const handleOpenChangeProduct = (open: boolean) => {
    setOpenProduct(open)

    if (!open) {
      resetProductForm()
      return
    }

    if (!editingProduct) {
      resetProductForm()
    }
  }

  const handleOpenChangeCategory = (open: boolean) => {
    setOpenCategory(open)

    if (!open) {
      resetCategoryForm()
      return
    }

    if (!editingCategory) {
      resetCategoryForm()
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setOpenProduct(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setOpenCategory(true)
  }

  const categorizedProducts = categories.map((category) => ({
    category,
    items: products.filter((product) => product.categoryId === category.id)
  }))

  const uncategorizedProducts = products.filter((product) => !product.categoryId)

  return (
    <AdminShell
      title="Produtos"
      subtitle="Gerencie seu cardápio"
      storeName={resolvedStore.name}
      stats={[
        { label: 'Produtos', value: products.length, helper: 'Itens cadastrados' },
        { label: 'Categorias', value: categories.length, helper: 'Organização' }
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Dialog open={openCategory} onOpenChange={handleOpenChangeCategory}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full border-red-500 text-white hover:bg-red-950">
                <FolderPlus className="mr-2 h-4 w-4" />
                Nova categoria
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-black border-red-900 text-white">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? 'Editar categoria' : 'Nova categoria'}
                </DialogTitle>

                <DialogDescription className="text-zinc-400">
                  {editingCategory
                    ? 'Atualize o nome da categoria'
                    : 'Crie uma categoria para organizar seu cardápio'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitCategory} className="space-y-4">
                <div>
                  <Label className="text-white">Nome da categoria</Label>
                  <Input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ex: Hambúrgueres"
                    className="bg-white text-black border border-zinc-300"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingCategory}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {savingCategory
                    ? 'Salvando...'
                    : editingCategory
                      ? 'Salvar categoria'
                      : 'Criar categoria'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={openProduct} onOpenChange={handleOpenChangeProduct}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-red-500 hover:bg-red-600">
                <Plus className="mr-2 h-4 w-4" />
                Novo produto
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-black border-red-900 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar produto' : 'Novo produto'}
                </DialogTitle>

                <DialogDescription className="text-zinc-400">
                  {editingProduct
                    ? 'Edite o item do seu cardápio'
                    : 'Cadastre um novo item no seu cardápio'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitProduct} className="space-y-4">
                <div>
                  <Label className="text-white">Nome</Label>
                  <Input
                    name="name"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="bg-white text-black border border-zinc-300"
                  />
                </div>

                <div>
                  <Label className="text-white">Descrição</Label>
                  <Input
                    name="description"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Descreva o produto"
                    className="bg-white text-black border border-zinc-300"
                  />
                </div>

                <div>
                  <Label className="text-white">Preço</Label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="bg-white text-black border border-zinc-300"
                  />
                </div>

                <div>
                  <Label className="text-white">Imagem (URL)</Label>
                  <Input
                    name="image"
                    value={productImage}
                    onChange={(e) => setProductImage(e.target.value)}
                    className="bg-white text-black border border-zinc-300"
                  />
                </div>

                <div>
                  <Label className="text-white">Categoria</Label>

                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="bg-white text-black border border-zinc-300">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>

                    <SelectContent className="bg-white text-black">
                      <SelectItem value="none">Sem categoria</SelectItem>

                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-white">Adicionais</Label>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addExtraField}
                      className="border-red-900 text-white hover:bg-red-950"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar adicional
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {productExtras.map((extra, index) => (
                      <div
                        key={extra.id}
                        className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 md:grid-cols-[1fr_140px_auto]"
                      >
                        <div>
                          <Label className="text-white">Nome do adicional</Label>
                          <Input
                            value={extra.name}
                            onChange={(e) => updateExtraField(extra.id, 'name', e.target.value)}
                            placeholder="Ex: Catchup"
                            className="bg-white text-black border border-zinc-300"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Preço</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={extra.price}
                            onChange={(e) => updateExtraField(extra.id, 'price', e.target.value)}
                            placeholder="0.00"
                            className="bg-white text-black border border-zinc-300"
                          />
                        </div>

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeExtraField(extra.id)}
                            className="w-full border-red-900 text-red-400 hover:bg-red-950"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </Button>
                        </div>

                        {index === 0 && (
                          <div className="md:col-span-3">
                            <p className="text-xs text-zinc-400">
                              Deixe em branco os adicionais que não quiser salvar.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={savingProduct}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {savingProduct
                    ? 'Salvando...'
                    : editingProduct
                      ? 'Salvar alterações'
                      : 'Criar produto'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Categorias</h2>
              <p className="text-sm text-zinc-400">
                Organize seus produtos por categoria
              </p>
            </div>
          </div>

          {categories.length === 0 ? (
            <Card className="bg-black border-red-900 text-white p-4">
              <p className="text-zinc-400">Nenhuma categoria cadastrada ainda.</p>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {categories.map((category) => {
                const totalProducts = products.filter((product) => product.categoryId === category.id).length

                return (
                  <Card key={category.id} className="bg-black border-red-900 text-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold">{category.name}</h3>
                        <p className="text-sm text-zinc-400">
                          {totalProducts} {totalProducts === 1 ? 'produto' : 'produtos'}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Pencil className="text-white h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">Produtos</h2>
            <p className="text-sm text-zinc-400">
              Gerencie os itens do seu cardápio
            </p>
          </div>

          {products.length === 0 ? (
            <Card className="bg-black border-red-900 text-white p-4">
              <p className="text-zinc-400">Nenhum produto cadastrado ainda.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {categorizedProducts.map(({ category, items }) => (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <h3 className="text-base font-semibold text-white">{category.name}</h3>
                    <span className="text-sm text-zinc-500">
                      ({items.length})
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <Card className="bg-black border-red-900 text-white p-4">
                      <p className="text-zinc-400">Nenhum produto nesta categoria.</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {items.map((product) => (
                        <Card key={product.id} className="bg-black border-red-900 text-white p-4">
                          <div className="flex gap-4 items-center">
                            <div className="w-20 h-20 bg-zinc-900 rounded-xl overflow-hidden">
                              {product.image
                                ? <img src={product.image} className="w-full h-full object-cover" />
                                : <ImageIcon />
                              }
                            </div>

                            <div className="flex-1">
                              <h3 className="font-bold">{product.name}</h3>

                              {(product as any).description && (
                                <p className="text-sm text-zinc-400">
                                  {(product as any).description}
                                </p>
                              )}

                              <p className="text-red-500 font-bold mt-1">
                                {Number(product.price || 0).toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </p>

                              {Array.isArray((product as any).extras) && (product as any).extras.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {(product as any).extras.map((extra: any) => (
                                    <div
                                      key={extra.id || extra.name}
                                      className="flex items-center justify-between text-sm text-zinc-400"
                                    >
                                      <span>+ {extra.name}</span>
                                      <span>
                                        {Number(extra.price || 0).toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL'
                                        })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Pencil className="text-white h-4 w-4" />
                              </Button>

                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-zinc-500" />
                  <h3 className="text-base font-semibold text-white">Sem categoria</h3>
                  <span className="text-sm text-zinc-500">
                    ({uncategorizedProducts.length})
                  </span>
                </div>

                {uncategorizedProducts.length === 0 ? (
                  <Card className="bg-black border-red-900 text-white p-4">
                    <p className="text-zinc-400">Nenhum produto sem categoria.</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {uncategorizedProducts.map((product) => (
                      <Card key={product.id} className="bg-black border-red-900 text-white p-4">
                        <div className="flex gap-4 items-center">
                          <div className="w-20 h-20 bg-zinc-900 rounded-xl overflow-hidden">
                            {product.image
                              ? <img src={product.image} className="w-full h-full object-cover" />
                              : <ImageIcon />
                            }
                          </div>

                          <div className="flex-1">
                            <h3 className="font-bold">{product.name}</h3>

                            {(product as any).description && (
                              <p className="text-sm text-zinc-400">
                                {(product as any).description}
                              </p>
                            )}

                            <p className="text-red-500 font-bold mt-1">
                              {Number(product.price || 0).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </p>

                            {Array.isArray((product as any).extras) && (product as any).extras.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {(product as any).extras.map((extra: any) => (
                                  <div
                                    key={extra.id || extra.name}
                                    className="flex items-center justify-between text-sm text-zinc-400"
                                  >
                                    <span>+ {extra.name}</span>
                                    <span>
                                      {Number(extra.price || 0).toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                      })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Pencil className="text-white h-4 w-4" />
                            </Button>

                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  )
}
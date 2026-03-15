import { Card } from '../../components/ui/card'
import { useState, useEffect, useMemo } from 'react'
import {
  FolderPlus,
  ImageIcon,
  Package2,
  Pencil,
  Plus,
  Trash2,
  Crown,
  Sparkles,
  ShoppingBag
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Product, Category } from '../../types'
import { toast } from 'sonner'
import { AdminShell } from '../../components/admin/AdminShell'
import { AdminEmptyState } from '../../components/admin/AdminEmptyState'

type UpgradeModalState = {
  open: boolean
  title: string
  description: string
  currentPlan: string
  suggestedPlans: string[]
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
    deleteCategory
  } = useStore()

  const [openProduct,setOpenProduct] = useState(false)
  const [openCategory,setOpenCategory] = useState(false)

  const [editingProduct,setEditingProduct] = useState<Product | null>(null)
  const [editingCategory,setEditingCategory] = useState<Category | null>(null)

  const [selectedCategoryId,setSelectedCategoryId] = useState<string>('none')

  const [savingProduct,setSavingProduct] = useState(false)
  const [savingCategory,setSavingCategory] = useState(false)

  const [authChecked,setAuthChecked] = useState(false)

  const [upgradeModal,setUpgradeModal] = useState<UpgradeModalState>({
    open:false,
    title:'',
    description:'',
    currentPlan:'',
    suggestedPlans:[]
  })

  useEffect(()=>{

    if(authLoading) return

    setAuthChecked(true)

    if(!user || user.role !== 'admin'){
      navigate('/login',{replace:true})
    }

  },[user,authLoading,navigate])

  const resolvedStore = useMemo(()=>{

    if(!user || user.role !== 'admin') return undefined

    const directStore = user.storeId ? getStore(user.storeId) : undefined
    if(directStore) return directStore

    const byEmail = getStoreByAdminEmail(user.email)
    if(byEmail) return byEmail

    if(isLoaded && stores.length === 1) return stores[0]

    return undefined

  },[user,isLoaded,stores,getStore,getStoreByAdminEmail])

  const products = resolvedStore ? getStoreProducts(resolvedStore.id) : []
  const categories = resolvedStore ? getStoreCategories(resolvedStore.id) : []

  const currentPlanName = getHumanPlanName((resolvedStore as any)?.plan)

  if(authLoading || !authChecked || !isLoaded){
    return <div className="p-6">Carregando catálogo...</div>
  }

  if(!user || user.role !== 'admin'){
    return null
  }

  if(!resolvedStore){
    return <div className="p-6">Loja não encontrada.</div>
  }

  const categoryMap = new Map(categories.map(category=>[category.id,category.name]))

  const openUpgradeModalFromError = (message:string)=>{

    const planName = getHumanPlanName((resolvedStore as any)?.plan)
    const suggestedPlans = getSuggestedPlans((resolvedStore as any)?.plan)

    setUpgradeModal({
      open:true,
      title:'Limite do plano atingido',
      description:message,
      currentPlan:planName,
      suggestedPlans
    })

  }

  const handleSubmitProduct = async(e:React.FormEvent<HTMLFormElement>)=>{

    e.preventDefault()

    if(savingProduct) return

    if(!isLoaded || !resolvedStore){
      toast.error('Dados da loja ainda estão sendo carregados.')
      return
    }

    const formData = new FormData(e.currentTarget)

    const name = String(formData.get('name') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const priceRaw = String(formData.get('price') || '').trim()
    const image = String(formData.get('image') || '').trim()
    const extrasRaw = String(formData.get('extras') || '').trim()

    const extras = extrasRaw
      ? extrasRaw.split('+').map(e=>e.trim()).filter(Boolean)
      : []

    if(!name){
      toast.error('Informe o nome do produto.')
      return
    }

    if(!priceRaw || Number.isNaN(Number(priceRaw))){
      toast.error('Informe um preço válido.')
      return
    }

    if(!image){
      toast.error('Informe a URL da imagem.')
      return
    }

    setSavingProduct(true)

    try{

      const productData = {
        name,
        description,
        price:Number(priceRaw),
        image,
        extras,
        categoryId:selectedCategoryId === 'none' ? undefined : selectedCategoryId,
        storeId:resolvedStore.id,
        available:true
      }

      if(editingProduct){

        await updateProduct(editingProduct.id,productData)
        toast.success('Produto atualizado com sucesso!')

      }else{

        await addProduct({
          id:`product-${Date.now()}`,
          ...productData
        })

        toast.success('Produto adicionado com sucesso!')
      }

      setOpenProduct(false)
      setEditingProduct(null)
      setSelectedCategoryId('none')

    }catch(error:any){

      const message = error?.message || 'Não foi possível salvar o produto.'

      if(
        String(message).toLowerCase().includes('limite') &&
        String(message).toLowerCase().includes('produto')
      ){

        toast.error('Limite de produtos atingido')

        setOpenProduct(false)

        openUpgradeModalFromError(message)

        return
      }

      toast.error(message)

    }finally{
      setSavingProduct(false)
    }

  }

  const handleDeleteProduct = async(id:string)=>{

    if(!confirm('Deseja realmente excluir este produto?')) return

    await deleteProduct(id)

    toast.success('Produto excluído')

  }

  const handleOpenChangeProduct = (open:boolean)=>{

    setOpenProduct(open)

    if(!open){
      setEditingProduct(null)
      setSelectedCategoryId('none')
    }

  }

  return(

    <AdminShell
      title="Produtos"
      subtitle="Gerencie seu cardápio"
      storeName={resolvedStore.name}
      stats={[
        {label:'Produtos',value:products.length,helper:'Itens cadastrados'},
        {label:'Categorias',value:categories.length,helper:'Organização'}
      ]}
      actions={

        <Dialog open={openProduct} onOpenChange={handleOpenChangeProduct}>

          <DialogTrigger asChild>

            <Button className="rounded-full bg-red-500 hover:bg-red-600">
              <Plus className="mr-2 h-4 w-4"/>
              Novo produto
            </Button>

          </DialogTrigger>

          <DialogContent className="bg-black border-red-900 text-white">

            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar produto' : 'Novo produto'}
              </DialogTitle>

              <DialogDescription className="text-zinc-400">
                Cadastre um novo item no seu cardápio
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitProduct} className="space-y-4">

              <div>
                <Label className="text-white">Nome</Label>
                <Input
                  name="name"
                  defaultValue={editingProduct?.name || ''}
                  className="bg-white text-black border border-zinc-300"
                />
              </div>

              <div>
                <Label className="text-white">Descrição</Label>
                <Input
                  name="description"
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
                  className="bg-white text-black border border-zinc-300"
                />
              </div>

              <div>
                <Label className="text-white">Imagem (URL)</Label>
                <Input
                  name="image"
                  className="bg-white text-black border border-zinc-300"
                />
              </div>

              <div>
                <Label className="text-white">Categoria</Label>

                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>

                  <SelectTrigger className="bg-white text-black border border-zinc-300">
                    <SelectValue placeholder="Categoria"/>
                  </SelectTrigger>

                  <SelectContent className="bg-white text-black">

                    <SelectItem value="none">Sem categoria</SelectItem>

                    {categories.map(category=>(
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}

                  </SelectContent>

                </Select>
              </div>

              <div>
                <Label className="text-white">Adicionais</Label>
                <Input
                  name="extras"
                  placeholder="+ frango + bacon + queijo"
                  className="bg-white text-black border border-zinc-300"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Criar produto
              </Button>

            </form>

          </DialogContent>

        </Dialog>

      }

    >

      <div className="grid gap-4 xl:grid-cols-2">

        {products.map(product=>(

          <Card key={product.id} className="bg-black border-red-900 text-white p-4">

            <div className="flex gap-4 items-center">

              <div className="w-20 h-20 bg-zinc-900 rounded-xl overflow-hidden">

                {product.image
                  ? <img src={product.image} className="w-full h-full object-cover"/>
                  : <ImageIcon/>
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
                  R$ {product.price.toFixed(2)}
                </p>

              </div>

              <div className="flex gap-2">

                <Button
                  size="icon"
                  variant="outline"
                  onClick={()=>handleDeleteProduct(product.id)}
                >
                  <Trash2 className="text-red-500"/>
                </Button>

              </div>

            </div>

          </Card>

        ))}

      </div>

    </AdminShell>

  )

}
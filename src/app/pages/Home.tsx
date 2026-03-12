import { ShoppingCart, LogIn, Package, LayoutDashboard } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../contexts/StoreContext';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export function Home() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { stores, isLoaded, getStore, getStoreCategories, getProductsByCategory } = useStore();
  const { items, addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [resolvingStore, setResolvingStore] = useState(false);

  const storeIdFromQuery = searchParams.get('store');
  const slugFromQuery = searchParams.get('slug');
  const routeSlug = slug?.trim().toLowerCase() || '';

  const store = useMemo(() => {
    if (routeSlug) {
      const byRouteSlug = stores.find(
        (s: any) => (s.slug || '').trim().toLowerCase() === routeSlug
      );
      if (byRouteSlug) return byRouteSlug;
    }

    if (storeIdFromQuery) {
      const byId = getStore(storeIdFromQuery);
      if (byId) return byId;

      const bySlug = stores.find(
        (s: any) => (s.slug || '').trim().toLowerCase() === storeIdFromQuery.trim().toLowerCase()
      );
      if (bySlug) return bySlug;
    }

    if (slugFromQuery) {
      const bySlug = stores.find(
        (s: any) => (s.slug || '').trim().toLowerCase() === slugFromQuery.trim().toLowerCase()
      );
      if (bySlug) return bySlug;
    }

    const activeStores = stores.filter((s) => s.active && !s.suspended);
    if (activeStores.length > 0) return activeStores[0];

    return stores[0];
  }, [routeSlug, storeIdFromQuery, slugFromQuery, stores, getStore]);

  const triedResolveRef = useRef(false);

  useEffect(() => {
    if (triedResolveRef.current) return;
    if (store) return;

    const lookupValue = routeSlug || storeIdFromQuery || slugFromQuery;
    if (!lookupValue) return;

    triedResolveRef.current = true;
    setResolvingStore(true);

    (async () => {
      try {
        const searchValue = lookupValue.trim();

        let { data: found, error } = await supabase
          .from('stores')
          .select('id, slug')
          .ilike('slug', searchValue)
          .maybeSingle();

        if (error || !found) {
          const { data: byName, error: nameErr } = await supabase
            .from('stores')
            .select('id, slug')
            .ilike('name', searchValue)
            .maybeSingle();

          if (nameErr) {
            console.error('Erro ao buscar loja por name fallback:', nameErr);
          }

          found = byName || null;
        }

        if (found?.slug) {
          navigate(`/loja/${found.slug}`, { replace: true });
          return;
        }

        if (found?.id) {
          const newSearch = new URLSearchParams(window.location.search);
          newSearch.set('store', String(found.id));
          navigate(`${window.location.pathname}?${newSearch.toString()}`, { replace: true });
        }
      } catch (e) {
        console.error('Erro no fallback de resolução de store:', e);
      } finally {
        setResolvingStore(false);
      }
    })();
  }, [routeSlug, storeIdFromQuery, slugFromQuery, store, navigate]);

  useEffect(() => {
    triedResolveRef.current = false;
  }, [routeSlug, storeIdFromQuery, slugFromQuery]);

  const resolvedStoreId = store?.id;
  const categories = resolvedStoreId ? getStoreCategories(resolvedStoreId) : [];
  const isStoreBlocked = !!store && (!store.active || store.suspended);

  useEffect(() => {
    if (isStoreBlocked) return;

    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].id);
      return;
    }

    if (selectedCategory && !categories.some((c) => c.id === selectedCategory)) {
      setSelectedCategory(categories[0]?.id ?? null);
    }
  }, [categories, selectedCategory, isStoreBlocked]);

  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!store && (resolvingStore || (!isLoaded && stores.length === 0))) {
    return <div className="p-4">Abrindo loja...</div>;
  }

  if (!store || !resolvedStoreId) {
    return <div className="p-4">Loja não encontrada</div>;
  }

  const displayProducts =
    !isStoreBlocked && selectedCategory
      ? getProductsByCategory(resolvedStoreId, selectedCategory)
      : [];

  const selectedCategoryName =
    categories.find((c) => c.id === selectedCategory)?.name || '';

  const goToPanel = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    navigate(user.role === 'super-admin' ? '/super-admin' : '/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#EA1D2C] shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl">{store.logo}</span>
            )}
            <h1 className="font-semibold text-white truncate">{store.name}</h1>
          </div>

          <div className="flex gap-2">
            {!isStoreBlocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/orders')}
                className="text-white hover:bg-white/10"
              >
                <Package className="w-4 h-4 mr-1" />
                Pedidos
              </Button>
            )}

            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPanel}
                className="text-white hover:bg-white/10"
              >
                <LayoutDashboard className="w-4 h-4 mr-1" />
                Painel
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="text-white hover:bg-white/10"
              >
                <LogIn className="w-4 h-4 mr-1" />
                Admin
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-lg mx-auto">
        {store.banner ? (
          <img
            src={store.banner}
            alt="Banner"
            className="w-full h-40 object-cover"
          />
        ) : (
          <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-gray-500">
            Banner da loja
          </div>
        )}
      </div>

      {isStoreBlocked ? (
        <div className="max-w-screen-lg mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Loja temporariamente fechada
            </h2>
            <p className="text-gray-600 text-base">
              No momento esta loja não está recebendo pedidos.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white sticky top-[56px] z-10 border-b">
            <div className="max-w-screen-lg mx-auto px-4 py-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.length === 0 ? (
                  <div className="text-sm text-gray-500">Nenhuma categoria cadastrada</div>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-[#EA1D2C] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="max-w-screen-lg mx-auto px-4 py-6">
            {!selectedCategory ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">Selecione uma categoria para ver os produtos</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  {selectedCategoryName}
                </h2>

                {displayProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>Nenhum produto nesta categoria</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white rounded-lg shadow-sm overflow-hidden flex hover:shadow-md transition-shadow"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-28 h-28 object-cover"
                        />

                        <div className="flex-1 p-3 flex flex-col justify-between">
                          <div>
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-lg font-semibold text-[#EA1D2C] mt-1">
                              R$ {product.price.toFixed(2)}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => addToCart(product)}
                            disabled={product.available === false}
                            className="mt-2 w-full bg-[#EA1D2C] hover:bg-[#D01929]"
                          >
                            {product.available === false ? 'Indisponível' : 'Adicionar'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {cartItemsCount > 0 && (
            <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-30">
              <Button
                size="lg"
                onClick={() => navigate('/cart')}
                className="rounded-full shadow-lg relative bg-[#EA1D2C] hover:bg-[#D01929]"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Ver Carrinho
                <Badge className="ml-2 bg-white text-[#EA1D2C] hover:bg-white">
                  {cartItemsCount}
                </Badge>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
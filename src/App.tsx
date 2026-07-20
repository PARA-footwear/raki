import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  ShoppingCart, Plus, Minus, Trash2, Settings, Check, Phone, MapPin, 
  Clock, Info, X, ChevronRight, ChevronDown, SlidersHorizontal, Sparkles, 
  Package, Lock, PlusCircle, RotateCcw, FileText, TrendingUp, DollarSign, 
  ShoppingBag, CheckCircle, Eye, RefreshCw, Star, MapPinned, User, ClipboardList,
  Search, ShieldAlert, Edit2, Camera
} from 'lucide-react';
import { INITIAL_PRODUCTS, TELEGRAM_CONFIG } from './data';
import { Product, CartItem, Order, Category } from './types';

// Seed mock orders if there are none, to make the Admin Panel instantly informative
const MOCK_ORDERS: Order[] = [
  {
    id: 'RAK-9482',
    customerName: 'Олександр Шевченко',
    customerPhone: '+38 (067) 123-45-67',
    deliveryMethod: 'courier',
    address: 'м. Київ, вул. Хрещатик, буд. 12, кв. 4',
    items: [
      { productName: 'Раки Середні «Класичні»', quantity: 2, unit: 'кг', prepType: 'boiled', price: 780 },
      { productName: 'Фірмовий Набір Спецій', quantity: 1, unit: 'шт', prepType: 'live', price: 65 }
    ],
    totalPrice: 1725, // (780 * 2) + 100 cooking + 65 spices + 0 delivery (free > 1500)
    status: 'preparing',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 mins ago
  },
  {
    id: 'RAK-2104',
    customerName: 'Марія Ковальчук',
    customerPhone: '+38 (093) 765-43-21',
    deliveryMethod: 'pickup',
    address: 'Самовивіз з раковарні',
    items: [
      { productName: 'Раки Крупні «Елітні»', quantity: 1.5, unit: 'кг', prepType: 'live', price: 1050 }
    ],
    totalPrice: 1575, // 1050 * 1.5 = 1575, live (no cooking fee), pickup (no delivery fee)
    status: 'pending',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 mins ago
  }
];

export default function App() {
  // State initialization: products load directly from the code file (INITIAL_PRODUCTS)
  // to ensure any direct code changes are immediately visible in the browser.
  const products = INITIAL_PRODUCTS;

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('rak_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('rak_orders');
    return saved ? JSON.parse(saved) : MOCK_ORDERS;
  });

  // UI States
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout & Order success tracking
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  
  // Checkout Form States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'pickup'>('courier');
  const [address, setAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState<'now' | 'scheduled'>('now');
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [comment, setComment] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('rak_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('rak_orders', JSON.stringify(orders));
  }, [orders]);

  // Working hours check: 10:00 to 21:00 Kyiv time
  const isOpenNow = useMemo(() => {
    const hours = new Date().getHours();
    return hours >= 10 && hours < 21;
  }, []);

  // Preset images helper for admin
  const PRESET_IMAGES = [
    { label: 'Червоні варені раки', url: 'https://images.unsplash.com/photo-1615087240969-eeff2fa558f2?auto=format&fit=crop&w=600&q=80' },
    { label: 'Живі зеленкуваті раки', url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=600&q=80' },
    { label: 'Раки великі на тарілці', url: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?auto=format&fit=crop&w=600&q=80' },
    { label: 'Спеції для варіння', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80' },
    { label: 'Лимон та соус', url: 'https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?auto=format&fit=crop&w=600&q=80' }
  ];

  // Cart calculations
  const totalWeight = useMemo(() => {
    return cart
      .filter(item => item.product.unit === 'кг')
      .reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const rawSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [cart]);

  // Cooking fee: +200 UAH per kg of boiled crawfish
  const cookingFee = useMemo(() => {
    return cart
      .filter(item => item.prepType === 'boiled' && item.product.unit === 'кг')
      .reduce((acc, item) => acc + (item.quantity * 200), 0);
  }, [cart]);

  // Gift spices check: free gift package of spices if total crawfish weight is >= 2kg
  const qualifiesForFreeSpices = totalWeight >= 2;

  // Delivery: free for orders over 1500 UAH, otherwise 120 UAH (only if courier)
  const deliveryFee = useMemo(() => {
    if (deliveryMethod === 'pickup') return 0;
    const currentSubtotal = rawSubtotal + cookingFee;
    return currentSubtotal >= 1500 ? 0 : 120;
  }, [rawSubtotal, cookingFee, deliveryMethod]);

  const grandTotal = useMemo(() => {
    return rawSubtotal + cookingFee + deliveryFee;
  }, [rawSubtotal, cookingFee, deliveryFee]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.product.unit === 'кг' ? 1 : item.quantity), 0);
  }, [cart]);

  // Active Order details for live tracking screen
  const activeOrder = useMemo(() => {
    if (!activeOrderId) return null;
    return orders.find(o => o.id === activeOrderId) || null;
  }, [orders, activeOrderId]);

  // Filtered and Sorted Products
  const processedProducts = useMemo(() => {
    let result = [...products];

    // Filter by Category
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filter by Search
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query) ||
        p.size.toLowerCase().includes(query)
      );
    }

    // Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Catalog item custom quantities state
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  // Catalog item custom prepTypes state ('live' or 'boiled')
  const [prepTypes, setPrepTypes] = useState<Record<string, 'live' | 'boiled'>>({});

  const handleQtyChange = (productId: string, delta: number, unit: 'кг' | 'шт') => {
    const current = quantities[productId] ?? (unit === 'кг' ? 1 : 1);
    const step = unit === 'кг' ? 0.5 : 1;
    const min = unit === 'кг' ? 0.5 : 1;
    const updated = Math.max(min, current + (delta * step));
    setQuantities(prev => ({ ...prev, [productId]: parseFloat(updated.toFixed(1)) }));
  };

  const handlePrepTypeChange = (productId: string, type: 'live' | 'boiled') => {
    setPrepTypes(prev => ({ ...prev, [productId]: type }));
  };

  // Cart Actions
  const addToCart = (product: Product) => {
    const qty = quantities[product.id] ?? (product.unit === 'кг' ? 1.5 : 1);
    const prepType = product.category === 'live' ? (prepTypes[product.id] ?? 'boiled') : 'live';

    setCart(prev => {
      // Check if product with same prepType is already in cart
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.prepType === prepType
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: parseFloat((updated[existingIndex].quantity + qty).toFixed(1))
        };
        return updated;
      } else {
        return [...prev, { product, quantity: qty, prepType }];
      }
    });

    // Reset temporary quantity state for this product
    setQuantities(prev => ({ ...prev, [product.id]: product.unit === 'кг' ? 1.5 : 1 }));
  };

  const updateCartItemQuantity = (productId: string, prepType: 'live' | 'boiled', quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, prepType);
      return;
    }
    setCart(prev => 
      prev.map(item => 
        (item.product.id === productId && item.prepType === prepType)
          ? { ...item, quantity: parseFloat(quantity.toFixed(1)) }
          : item
      )
    );
  };

  const removeFromCart = (productId: string, prepType: 'live' | 'boiled') => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.prepType === prepType)));
  };

  // Checkout submission
  const handleCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Будь ласка, заповніть обов’язкові поля (Ім’я та Телефон)');
      return;
    }
    if (deliveryMethod === 'courier' && !address.trim()) {
      alert('Будь ласка, вкажіть адресу доставки');
      return;
    }

    setIsSubmittingOrder(true);

    // Simulate network delay and client-side tracking state
    setTimeout(() => {
      const orderId = `RAK-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newOrder: Order = {
        id: orderId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryMethod,
        address: deliveryMethod === 'courier' ? address.trim() : 'Самовивіз з раковарні',
        items: cart.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          unit: item.product.unit,
          prepType: item.prepType,
          price: item.product.price
        })),
        totalPrice: grandTotal,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Active integration with Telegram bot to notify group
      const sendToTelegram = async (order: Order) => {
        const { token, chatId } = TELEGRAM_CONFIG;
        
        // Skip sending if chatId is not configured properly yet
        if (!chatId || chatId === '-100' || chatId.trim() === '') {
          console.warn('⚠️ Telegram Chat ID не налаштований у файлі src/data.ts. Будь ласка, вкажіть ID вашої групи.');
          return;
        }

        const itemsList = order.items.map(it => 
          `• <b>${it.productName}</b>: ${it.quantity} ${it.unit} (${it.prepType === 'boiled' ? 'зварений 🥣' : 'живий 🦞'})`
        ).join('\n');

        const text = `🔔 <b>НОВЕ ЗАМОВЛЕННЯ ${order.id}</b>\n\n` +
                     `👤 <b>Клієнт:</b> ${order.customerName}\n` +
                     `📞 <b>Телефон:</b> ${order.customerPhone}\n` +
                     `🚚 <b>Доставка:</b> ${order.deliveryMethod === 'courier' ? '🚙 Кур’єром' : '🏪 Самовивіз'}\n` +
                     `📍 <b>Адреса:</b> ${order.address}\n` +
                     `💬 <b>Коментар:</b> ${comment.trim() || '—'}\n\n` +
                     `🛒 <b>Товари:</b>\n${itemsList}\n\n` +
                     `💰 <b>Загальна сума:</b> <b>${order.totalPrice} грн</b>`;

        try {
          const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: text,
              parse_mode: 'HTML'
            })
          });
          if (response.ok) {
            console.log('✅ Замовлення успішно відправлено в Телеграм групу!');
          } else {
            const errData = await response.json();
            console.error('❌ Помилка Telegram API при відправці:', errData);
          }
        } catch (error) {
          console.error('❌ Помилка мережі при відправці в Telegram:', error);
        }
      };

      sendToTelegram(newOrder);

      setOrders(prev => [newOrder, ...prev]);
      setActiveOrderId(orderId);
      
      // Clear Cart and close Drawer
      setCart([]);
      setIsCartOpen(false);
      setIsSubmittingOrder(false);

      // Reset form states
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setComment('');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col selection:bg-rose-500 selection:text-white">
      
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveOrderId(null)}>
              <div className="bg-brand-coral hover:bg-brand-coral-dark text-white p-3 rounded-full shadow-md transition-transform duration-300 hover:rotate-12">
                <span className="text-2xl block leading-none">🦞</span>
              </div>
              <div>
                <h1 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-slate-900 flex items-center gap-1.5">
                  РАКИ У <span className="text-brand-coral">РОМАНА</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-widest -mt-1">
                  Живі та варені раки
                </p>
              </div>
            </div>

            {/* Contacts & Working Hours (Hidden on small mobile, visible on tablet+) */}
            <div className="hidden md:flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-brand-coral" />
                <div>
                  <div className="text-xs font-semibold text-slate-500">Графік роботи:</div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    10:00 - 21:00
                    {isOpenNow ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 animate-pulse-subtle">
                        ● Відчинено
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-800">
                        ○ Зачинено
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-brand-coral" />
                <div>
                  <div className="text-xs font-semibold text-slate-500">Замовити за телефоном:</div>
                  <div className="text-sm font-extrabold text-slate-900 hover:text-brand-coral transition-colors">
                    <a href="tel:+380931234567">+38 (093) 123-45-67</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Cart & Quick Actions */}
            <div className="flex items-center space-x-3">
              {/* Quick Call Button for small screen */}
              <a href="tel:+380931234567" className="md:hidden p-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-brand-coral transition-colors">
                <Phone className="h-5 w-5" />
              </a>

              {/* Shopping Cart Button */}
              <button 
                id="cart-toggle-btn"
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center space-x-2 bg-brand-coral hover:bg-brand-coral-dark text-white px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 font-semibold group"
              >
                <ShoppingCart className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline text-sm">Кошик</span>
                <span className="bg-white text-brand-coral font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-xs animate-bounce">
                  {cartItemsCount}
                </span>
                {rawSubtotal > 0 && (
                  <span className="hidden md:inline text-xs border-l border-white/30 pl-2 font-mono font-medium">
                    {rawSubtotal + cookingFee} грн
                  </span>
                )}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* MOBILE HEADER CONTACTS (only on mobile) */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-brand-coral" />
          <span>Сьогодні: 10:00 - 21:00</span>
          {isOpenNow ? (
            <span className="text-emerald-400 font-bold ml-1">● Відчинено</span>
          ) : (
            <span className="text-rose-400 font-bold ml-1">● Зачинено</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Phone className="h-3.5 w-3.5 text-brand-coral" />
          <a href="tel:+380931234567" className="underline font-bold">+38 (093) 123-45-67</a>
        </div>
      </div>

      <main className="flex-grow">

        {/* ORDER LIVE TRACKING VIEW (If order has just been placed) */}
        {activeOrder && (
          <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
              {/* Receipt Header */}
              <div className="bg-gradient-to-r from-rose-500 to-brand-coral text-white p-6 sm:p-8 text-center relative">
                <button 
                  onClick={() => setActiveOrderId(null)} 
                  className="absolute right-4 top-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="inline-flex bg-white/20 p-3 rounded-full mb-4 animate-float">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl mb-2">Дякуємо за замовлення!</h2>
                <p className="text-sm text-rose-50 font-medium">
                  Ваша заявка успішно зареєстрована. Наш менеджер вже готує раків до відправки.
                </p>
                <div className="mt-4 inline-block bg-slate-900/30 px-4 py-1.5 rounded-full text-sm font-mono font-bold tracking-wider">
                  НОМЕР ЗАМОВЛЕННЯ: {activeOrder.id}
                </div>
              </div>

              {/* Real-time status simulation bar */}
              <div className="p-6 sm:p-8 border-b border-slate-100 bg-rose-50/30">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 text-center sm:text-left">
                  Статус виконання в реальному часі:
                </h3>
                
                {/* Visual Stepper */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
                  {/* Step 1 */}
                  <div className="flex items-center space-x-3 sm:flex-col sm:space-x-0 sm:space-y-2 sm:text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all ${
                      activeOrder.status === 'pending' || activeOrder.status === 'preparing' || activeOrder.status === 'delivered'
                        ? 'bg-brand-coral text-white scale-110'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      1
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">Прийнято в обробку</div>
                      <p className="text-xs text-slate-500">Менеджер підтвердив замовлення</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center space-x-3 sm:flex-col sm:space-x-0 sm:space-y-2 sm:text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all ${
                      activeOrder.status === 'preparing' || activeOrder.status === 'delivered'
                        ? 'bg-brand-coral text-white scale-110'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      2
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800 flex items-center gap-1 sm:justify-center">
                        Вариться / Пакується
                        {activeOrder.status === 'preparing' && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">Варимо за фірмовим рецептом</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center space-x-3 sm:flex-col sm:space-x-0 sm:space-y-2 sm:text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all ${
                      activeOrder.status === 'delivered'
                        ? 'bg-emerald-600 text-white scale-110'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      3
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">Передано кур'єру / Готово</div>
                      <p className="text-xs text-slate-500">Доставка гарячим за 60 хв</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-white p-4 rounded-xl border border-rose-100 flex items-start gap-3">
                  <Info className="h-5 w-5 text-brand-coral shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Підказка для тестування:</strong> Скрольте сторінку вниз до <span className="text-brand-coral font-semibold">Адмін-Панелі</span>. Там ви зможете змінити статус цього замовлення (наприклад, на «Вариться» чи «Доставлено»), і статус на цій плашці оновиться миттєво без перезавантаження!
                  </p>
                </div>
              </div>

              {/* Order Invoice Details */}
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Delivery Info */}
                  <div>
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-brand-coral" /> Дані отримувача
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li><span className="text-slate-400">Ім'я:</span> <strong className="text-slate-800">{activeOrder.customerName}</strong></li>
                      <li><span className="text-slate-400">Телефон:</span> <strong className="text-slate-800">{activeOrder.customerPhone}</strong></li>
                      <li>
                        <span className="text-slate-400">Спосіб доставки:</span>{' '}
                        <strong className="text-slate-800">
                          {activeOrder.deliveryMethod === 'courier' ? '🚚 Доставка кур\'єром' : '🏪 Самовивіз з раковарні'}
                        </strong>
                      </li>
                      {activeOrder.deliveryMethod === 'courier' && (
                        <li><span className="text-slate-400">Адреса:</span> <strong className="text-slate-800">{activeOrder.address}</strong></li>
                      )}
                    </ul>
                  </div>

                  {/* Order Items Summary */}
                  <div>
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-brand-coral" /> Склад замовлення
                    </h4>
                    <div className="divide-y divide-slate-100">
                      {activeOrder.items.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex justify-between text-sm">
                          <div>
                            <span className="font-semibold text-slate-800">{item.productName}</span>
                            <span className="text-xs text-slate-500 block">
                              Формат: {item.prepType === 'boiled' ? '🌶️ Варений (+200 грн/кг)' : '💧 Живий'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-600 block">{item.quantity} {item.unit} x {item.price} грн</span>
                            <span className="font-mono font-bold text-slate-900">
                              {item.quantity * item.price + (item.prepType === 'boiled' && item.unit === 'кг' ? item.quantity * 200 : 0)} грн
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                      <span className="font-bold text-slate-700">Загальна сума:</span>
                      <span className="font-display font-extrabold text-lg text-brand-coral">{activeOrder.totalPrice} грн</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => setActiveOrderId(null)} 
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-md"
                  >
                    Повернутися до покупок
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HERO HERO SECTION */}
        {!activeOrderId && (
          <section className="relative bg-slate-900 text-white overflow-hidden py-16 sm:py-24">
            {/* Background Image overlay with low opacity */}
            <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('https://i.postimg.cc/ZYGxqtZ5/7.png')" }}></div>
            {/* Black gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40 z-10"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                {/* Hero Texts */}
                <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                  <div className="inline-flex items-center space-x-2 bg-brand-coral/20 border border-brand-coral/40 text-brand-coral px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                    <Sparkles className="h-4 w-4 animate-spin-slow text-rose-400" />
                    <span>Свіжий вилов щодня</span>
                  </div>
                  <h1 className="font-display font-bold text-3xl sm:text-5xl md:text-6xl tracking-tight leading-tight">
                    Живі та варені раки з доставкою <span className="text-brand-coral">за 1 годину</span>
                  </h1>
                  <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed">
                    Варимо раків за класичним рецептом з великою кількістю духмяного кропу, часнику та спецій. Доставляємо гарячими в термопосуді прямо до вашого столу. Тільки свіжі та активні раки!
                  </p>

                  {/* Highlights checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 max-w-xl mx-auto lg:mx-0 text-left">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center space-x-3 hover:bg-white/10 transition-colors">
                      <div className="bg-brand-coral text-white p-2 rounded-lg text-sm shrink-0">🚀</div>
                      <div>
                        <div className="text-xs font-bold">Швидка доставка</div>
                        <p className="text-[10px] text-slate-400">Гарячими за 60 хв</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center space-x-3 hover:bg-white/10 transition-colors">
                      <div className="bg-brand-coral text-white p-2 rounded-lg text-sm shrink-0">💧</div>
                      <div>
                        <div className="text-xs font-bold">100% Свіжі раки</div>
                        <p className="text-[10px] text-slate-400">Прямо з водойм</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center space-x-3 hover:bg-white/10 transition-colors">
                      <div className="bg-brand-coral text-white p-2 rounded-lg text-sm shrink-0">🌿</div>
                      <div>
                        <div className="text-xs font-bold">Фірмовий рецепт</div>
                        <p className="text-[10px] text-slate-400">Спеції у подарунок</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                    <a 
                      href="#menu-catalog"
                      className="w-full sm:w-auto text-center px-8 py-4 bg-brand-coral hover:bg-brand-coral-dark text-white rounded-full font-bold shadow-lg shadow-brand-coral/30 hover:shadow-xl transition-all duration-300 text-base"
                    >
                      Перейти до меню
                    </a>
                    <a 
                      href="tel:+380931234567"
                      className="w-full sm:w-auto text-center px-8 py-4 bg-white/10 hover:bg-white/15 text-white rounded-full font-bold border border-white/20 transition-colors text-base flex items-center justify-center gap-2"
                    >
                      <Phone className="h-5 w-5 text-brand-coral" />
                      Подзвонити Роману
                    </a>
                  </div>
                </div>

                {/* Hero Illustration (Crayfish graphic) */}
                <div className="lg:col-span-5 flex justify-center relative">
                  <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-full bg-radial from-brand-coral/20 to-transparent flex items-center justify-center">
                    <div className="absolute inset-0 border border-brand-coral/10 rounded-full animate-pulse-subtle"></div>
                    <img 
                      src="https://i.postimg.cc/ZYGxqtZ5/7.png" 
                      alt="Boiled Crayfish Gourmet Plate"
                      className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 object-cover rounded-full shadow-2xl border-4 border-brand-coral animate-float relative z-10"
                    />
                    <div className="absolute bottom-4 right-4 bg-slate-900 border border-brand-coral/50 px-4 py-2.5 rounded-2xl shadow-lg text-center z-20">
                      <div className="flex items-center text-amber-400 text-xs font-bold justify-center">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">понад 1500 відгуків</span>
                      <strong className="text-xs text-white">4.9 / 5.0 оцінка</strong>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* PROMOTION ACCENT BANNER */}
        {!activeOrderId && (
          <div className="bg-rose-50 border-y border-rose-100 py-3 text-center text-xs sm:text-sm font-semibold text-rose-900 px-4">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-brand-coral animate-pulse" />
              <span>Безкоштовний фірмовий набір спецій та лимон до кожного замовлення раків від 2 кг! 🍋🌿</span>
            </span>
          </div>
        )}

        {/* CATALOG / PRODUCTS GRID */}
        {!activeOrderId && (
          <section id="menu-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-20">
            
            {/* Catalog header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-slate-100 gap-4">
              <div>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900">
                  Свіжий асортимент меню
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Виберіть потрібний калібр раків. Зверніть увагу: ціна вказана за 1 кг.
                </p>
              </div>

              {/* Sorting & Searching options */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Search field */}
                <div className="relative flex-grow sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Пошук раків..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Sort selector */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral transition-all appearance-none pr-8 font-medium text-slate-700"
                  >
                    <option value="default">Сортування за замовчуванням</option>
                    <option value="price-asc">Від найдешевших</option>
                    <option value="price-desc">Від найдорожчих</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex overflow-x-auto pb-4 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 gap-2 scrollbar-none">
              <button 
                onClick={() => setSelectedCategory('all')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 uppercase tracking-wider ${
                  selectedCategory === 'all' 
                    ? 'bg-brand-coral text-white shadow-md shadow-brand-coral/20' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Все меню 🍽️
              </button>
              <button 
                onClick={() => setSelectedCategory('live')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 uppercase tracking-wider ${
                  selectedCategory === 'live' 
                    ? 'bg-brand-coral text-white shadow-md shadow-brand-coral/20' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Наші раки 🦞
              </button>
              <button 
                onClick={() => setSelectedCategory('spices')}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all shrink-0 uppercase tracking-wider ${
                  selectedCategory === 'spices' 
                    ? 'bg-brand-coral text-white shadow-md shadow-brand-coral/20' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Спеції та соуси 🌿
              </button>
            </div>

            {/* Empty list search feedback */}
            {processedProducts.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                <span className="text-4xl block mb-2">🦞</span>
                <h3 className="font-bold text-lg text-slate-800">Нічого не знайдено</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Спробуйте змінити пошуковий запит або вибрати іншу категорію у верхній панелі вкладників.
                </p>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} 
                  className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-full hover:bg-slate-200 transition-colors"
                >
                  Скинути фільтри
                </button>
              </div>
            )}

            {/* Products grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {processedProducts.map((product) => {
                const itemQty = quantities[product.id] ?? (product.unit === 'кг' ? 1.5 : 1);
                const itemPrepType = product.category === 'live' ? (prepTypes[product.id] ?? 'boiled') : 'live';
                
                return (
                  <div 
                    key={product.id} 
                    className={`bg-white rounded-3xl shadow-xs hover:shadow-xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 group ${
                      !product.available ? 'opacity-65' : ''
                    }`}
                  >
                    
                    {/* Card Media Wrapper */}
                    <div className="h-60 overflow-hidden relative bg-slate-100">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />

                      {/* Tag badges overlay */}
                      <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                        <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {product.category === 'live' ? 'Річкові раки' : 'Додатки'}
                        </span>
                        <span className="bg-brand-coral text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md shadow-brand-coral/10">
                          {product.size}
                        </span>
                      </div>

                      {/* Stock availability indicator */}
                      {!product.available && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center text-white p-4">
                          <div className="text-center">
                            <ShieldAlert className="h-8 w-8 mx-auto mb-1 text-rose-400" />
                            <strong className="text-sm font-bold block uppercase tracking-wider">Тимчасово відсутній</strong>
                            <span className="text-[10px] text-slate-300 mt-1 block">Очікується найближчим часом</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div className="space-y-2">
                        <h3 className="font-display font-bold text-lg text-slate-900 group-hover:text-brand-coral transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-light">
                          {product.description}
                        </p>
                      </div>

                      {/* Config Options / Cooking Choice */}
                      <div className="mt-5 space-y-4">
                        {product.category === 'live' && product.available && (
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                              Якими вам доставити?
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handlePrepTypeChange(product.id, 'boiled')}
                                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                                  itemPrepType === 'boiled'
                                    ? 'bg-brand-coral-light border-2 border-brand-coral text-rose-800 shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <span className="text-sm">🌶️</span>
                                <div>
                                  <div className="leading-tight">Варені</div>
                                  <div className="text-[8px] opacity-75 font-normal">+200 грн/кг</div>
                                </div>
                              </button>

                              <button
                                onClick={() => handlePrepTypeChange(product.id, 'live')}
                                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                                  itemPrepType === 'live'
                                    ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-800 shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <span className="text-sm">💧</span>
                                <div>
                                  <div className="leading-tight">Живі</div>
                                  <div className="text-[8px] opacity-75 font-normal">безкоштовно</div>
                                </div>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Price, Quantity, Add to Cart row */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-medium tracking-wider">
                              Ціна за {product.unit}
                            </span>
                            <span className="font-display font-extrabold text-xl text-slate-900">
                              {product.price} <span className="text-sm font-normal text-slate-500">грн</span>
                            </span>
                          </div>

                          {/* Interactive Cart Controllers */}
                          {product.available ? (
                            <div className="flex items-center space-x-2">
                              {/* Quantity selection widget */}
                              <div className="flex items-center bg-slate-100 rounded-xl px-1 py-1 border border-slate-200/50">
                                <button 
                                  onClick={() => handleQtyChange(product.id, -1, product.unit)}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-10 text-center text-xs font-extrabold font-mono text-slate-800">
                                  {itemQty} {product.unit}
                                </span>
                                <button 
                                  onClick={() => handleQtyChange(product.id, 1, product.unit)}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Clickable Add Button */}
                              <button 
                                onClick={() => addToCart(product)}
                                className="bg-brand-coral hover:bg-brand-coral-dark text-white p-2.5 rounded-xl transition-colors shadow-md hover:shadow-lg focus:ring-2 focus:ring-brand-coral/20"
                                title="Додати у кошик"
                              >
                                <ShoppingCart className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              disabled
                              className="px-4 py-2 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed"
                            >
                              Немає в наявності
                            </button>
                          )}
                        </div>

                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* FREE SPICES SPECIAL NOTICE */}
            <div className="mt-12 bg-gradient-to-r from-rose-500 via-brand-coral to-amber-600 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute -right-12 -bottom-12 text-[150px] opacity-10 select-none pointer-events-none">🦞</div>
              
              <div className="space-y-2 text-center md:text-left max-w-2xl relative z-10">
                <span className="bg-white/20 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
                  Акція сезону
                </span>
                <h3 className="font-display font-bold text-xl sm:text-2xl md:text-3xl">
                  Спеції у подарунок для ідеальної варки! 🌿
                </h3>
                <p className="text-sm text-rose-50 font-light leading-relaxed">
                  Замовляйте від <strong>2 кг раків</strong> будь-якого розміру, і ми безкоштовно додамо фірмовий великий пакет спецій (стебловий сушений кріп, запашний перець, лавровий лист, духмяну суміш трав) та половину лимона для ідеального аромату вашого вишуканого обіду!
                </p>
              </div>

              <div className="shrink-0 relative z-10">
                <a 
                  href="#menu-catalog"
                  className="inline-block bg-white hover:bg-rose-50 text-brand-coral font-bold px-6 py-3 rounded-full shadow-lg transition-transform hover:scale-105 text-sm"
                >
                  Замовити зараз 🦞
                </a>
              </div>
            </div>

          </section>
        )}

      </main>

      {/* SHOPPING CART SLIDE-OVER DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay background */}
            <div 
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            ></div>

            {/* Sliding Panel */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full rounded-l-3xl border-l border-slate-100">
                
                {/* Cart Header */}
                <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-tl-3xl">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-brand-coral text-white p-2.5 rounded-full">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Кошик замовлень</h2>
                      <p className="text-xs text-slate-400">Усього товарів: {cartItemsCount}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Cart Body Scroll Area */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  {cart.length === 0 ? (
                    <div className="text-center py-20">
                      <span className="text-5xl block mb-4">🛒</span>
                      <strong className="text-slate-700 font-bold block text-base">Ваш кошик порожній</strong>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        Перейдіть до нашого свіжого каталогу вилову та додайте апетитні раки!
                      </p>
                      <button 
                        onClick={() => setIsCartOpen(false)}
                        className="mt-6 px-5 py-2.5 bg-brand-coral hover:bg-brand-coral-dark text-white rounded-full text-xs font-bold shadow-md transition-all"
                      >
                        Повернутися до меню
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Products list in Cart */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Обрані товари
                        </h3>
                        <div className="divide-y divide-slate-100">
                          {cart.map((item, index) => {
                            const subPrice = item.product.price * item.quantity;
                            const cookingAddition = item.prepType === 'boiled' && item.product.unit === 'кг' ? (item.quantity * 200) : 0;
                            const itemTotal = subPrice + cookingAddition;
                            
                            return (
                              <div key={`${item.product.id}-${item.prepType}-${index}`} className="py-3 flex items-start justify-between gap-3">
                                <img 
                                  src={item.product.imageUrl} 
                                  alt={item.product.name}
                                  className="w-14 h-14 object-cover rounded-xl shrink-0 border border-slate-100"
                                />
                                <div className="flex-grow min-w-0">
                                  <h4 className="text-sm font-semibold text-slate-800 truncate leading-tight">
                                    {item.product.name}
                                  </h4>
                                  <div className="flex items-center space-x-1.5 mt-0.5">
                                    <span className="text-[10px] text-slate-400">{item.product.size}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                      item.prepType === 'boiled' ? 'bg-rose-50 text-brand-coral' : 'bg-emerald-50 text-emerald-800'
                                    }`}>
                                      {item.prepType === 'boiled' ? '🌶️ Варений' : '💧 Живий'}
                                    </span>
                                  </div>

                                  {/* Quantity Modifier */}
                                  <div className="flex items-center space-x-2 mt-2">
                                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
                                      <button 
                                        onClick={() => updateCartItemQuantity(item.product.id, item.prepType, item.quantity - (item.product.unit === 'кг' ? 0.5 : 1))}
                                        className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-white"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className="w-12 text-center text-xs font-mono font-bold">
                                        {item.quantity} {item.product.unit}
                                      </span>
                                      <button 
                                        onClick={() => updateCartItemQuantity(item.product.id, item.prepType, item.quantity + (item.product.unit === 'кг' ? 0.5 : 1))}
                                        className="p-1 text-slate-500 hover:text-slate-800 rounded-md hover:bg-white"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <button 
                                    onClick={() => removeFromCart(item.product.id, item.prepType)}
                                    className="p-1 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                                    title="Видалити"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                  <div className="font-mono font-bold text-sm text-slate-900 mt-2">
                                    {itemTotal} грн
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Free Spices notification status */}
                      <div className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 border ${
                        qualifiesForFreeSpices 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                          : 'bg-amber-50 border-amber-100 text-amber-800'
                      }`}>
                        <Sparkles className={`h-5 w-5 shrink-0 ${qualifiesForFreeSpices ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}`} />
                        <div>
                          {qualifiesForFreeSpices ? (
                            <>
                              <strong className="block font-bold">Вітаємо! Спеції активовано 🎉</strong>
                              <span>Оскільки загальна вага раків становить {totalWeight} кг (більше 2 кг), ми додали безкоштовний подарунковий великий збір спецій!</span>
                            </>
                          ) : (
                            <>
                              <strong className="block font-bold">Подарунок за покупку раків 🌿</strong>
                              <span>Додайте ще {parseFloat((2 - totalWeight).toFixed(1))} кг раків, щоб безкоштовно отримати фірмовий великий набір для варіння!</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Checkout form submission info */}
                      <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-4 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Дані для оформлення доставки
                        </h3>

                        {/* Name field */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block">
                            Ваше ім'я *
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Наприклад: Дмитро"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral"
                          />
                        </div>

                        {/* Phone field */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block">
                            Номер телефону *
                          </label>
                          <input 
                            type="tel" 
                            required
                            placeholder="Наприклад: +38 (093) 123-45-67"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral"
                          />
                        </div>

                        {/* Delivery options */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block">
                            Спосіб доставки
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDeliveryMethod('courier')}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                deliveryMethod === 'courier'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              🚚 Доставка кур'єром
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeliveryMethod('pickup')}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                deliveryMethod === 'pickup'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              🏪 Самовивіз
                            </button>
                          </div>
                        </div>

                        {/* Address field (only if Courier is active) */}
                        {deliveryMethod === 'courier' && (
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">
                              Адреса доставки *
                            </label>
                            <textarea 
                              required
                              rows={2}
                              placeholder="Наприклад: вул. Хрещатик, буд. 1, кв. 15"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-coral/20 focus:border-brand-coral"
                            />
                          </div>
                        )}

                        {/* Delivery timing */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block">
                            Коли доставити?
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDeliveryTime('now')}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                deliveryTime === 'now'
                                  ? 'bg-slate-100 text-slate-800 font-extrabold border-2 border-slate-900'
                                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              ⚡ Найближчим часом
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeliveryTime('scheduled')}
                              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                deliveryTime === 'scheduled'
                                  ? 'bg-slate-100 text-slate-800 font-extrabold border-2 border-slate-900'
                                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              🕒 На конкретний час
                            </button>
                          </div>
                        </div>

                        {deliveryTime === 'scheduled' && (
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">
                              Бажаний час доставки (10:00 - 21:00)
                            </label>
                            <input 
                              type="time" 
                              min="10:00"
                              max="21:00"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2"
                            />
                          </div>
                        )}

                        {/* Comment/Note field */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 block">
                            Коментар до замовлення
                          </label>
                          <input 
                            type="text" 
                            placeholder="Наприклад: залиште біля дверей або зварити гостріше"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-coral/20"
                          />
                        </div>

                        {/* Bottom Total summary pricing card */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-6 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Вартість раків:</span>
                            <span className="font-mono font-semibold text-slate-800">{rawSubtotal} грн</span>
                          </div>
                          
                          {cookingFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Послуга варіння (+200 грн/кг):</span>
                              <span className="font-mono font-semibold text-rose-600">+{cookingFee} грн</span>
                            </div>
                          )}

                          <div className="flex justify-between">
                            <span className="text-slate-500">Доставка:</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {deliveryMethod === 'pickup' 
                                ? 'Самовивіз' 
                                : deliveryFee === 0 
                                  ? 'Безкоштовно (акція)' 
                                  : `${deliveryFee} грн`}
                            </span>
                          </div>

                          {deliveryMethod === 'courier' && (rawSubtotal + cookingFee) < 1500 && (
                            <div className="text-[10px] text-slate-400 text-right">
                              Безкоштовна доставка для замовлень від 1500 грн!
                            </div>
                          )}

                          <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-900">
                            <span>Загальна сума до сплати:</span>
                            <span className="font-display font-extrabold text-brand-coral text-base">{grandTotal} грн</span>
                          </div>
                        </div>

                        {/* Checkout Submit CTA */}
                        <button 
                          type="submit"
                          disabled={isSubmittingOrder}
                          className="w-full bg-brand-coral hover:bg-brand-coral-dark text-white py-3.5 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300 mt-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmittingOrder ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Оформлюємо замовлення...
                            </>
                          ) : (
                            <>
                              <Check className="h-5 w-5" />
                              Підтвердити замовлення • {grandTotal} грн
                            </>
                          )}
                        </button>

                      </form>
                    </>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white mt-12 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800 text-sm font-light">
            
            {/* Column 1: Info */}
            <div className="space-y-3 text-center md:text-left">
              <h4 className="font-display font-bold text-lg text-white flex items-center justify-center md:justify-start gap-1">
                🦞 Раки у <span className="text-brand-coral">Романа</span>
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Найкращий вибір добірних живих та свіжозварених раків у вашому місті. Гарантія якості, щоденний прийом вилову та найшвидша доставка в термобоксах.
              </p>
              <div className="text-xs text-slate-500 pt-1">
                © 2026 Всі права захищено.
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="space-y-3 text-center">
              <h4 className="font-bold text-slate-300">Важлива інформація</h4>
              <p className="text-slate-400 text-xs">
                Приймаємо замовлення щодня з 10:00 до 21:00. При самовивозі діє знижка -5% на весь асортимент меню!
              </p>

            </div>

            {/* Column 3: Contacts */}
            <div className="space-y-3 text-center md:text-right flex flex-col items-center md:items-end">
              <h4 className="font-bold text-slate-300">Контакти раковарні</h4>
              <span className="text-slate-400 text-xs">Адреса: м. Київ, Кловський узвіз, 14/24</span>
              <a href="tel:+380931234567" className="text-brand-coral font-bold hover:underline">
                +38 (093) 123-45-67
              </a>
            </div>

          </div>

          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>Тестова версія інтернет-магазину. Всі дані зберігаються у Вашому браузері.</p>
            <div className="flex items-center gap-2 select-none">
              <span className="font-mono text-[10px]">v1.2.0-React-Tailwind</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

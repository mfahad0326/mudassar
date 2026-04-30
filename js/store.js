

const FIREBASE_URL = "https://mudassar-c39c9-default-rtdb.firebaseio.com/";
// ↑ Replace with YOUR Firebase database URL

const ADMIN_HASH = "547a514003ae3736e07933fd15977b372d362d6a3cbe71bc983070cad5a5cf56";
// SHA-256 of "mudassar:urduadab"

const LS = {
  CART:   "kg_cart",
  ORDERS: "kg_orders",
  ADMIN:  "kg_admin",
  CACHE:  "kg_cache",
};

const DEFAULT_CATEGORIES = [
  { slug:"urdu-books",     name:"Urdu Books",     icon:"📕", color:"#e74c3c" },
  { slug:"islamic-books",  name:"Islamic Books",  icon:"🕌", color:"#27ae60" },
  { slug:"english-books",  name:"English Books",  icon:"📖", color:"#2980b9" },
  { slug:"kids-corner",    name:"Kids Corner",    icon:"🧒", color:"#f39c12" },
  { slug:"academic-books", name:"Academic Books", icon:"🎓", color:"#8e44ad" },
];

const DEFAULT_BOOKS = [
  { id:"b1",  title:"Aab-e-Hayat",          author:"M. Hussain Azad",        category:"urdu-books",     price:1450, stock:12, featured:true,  rating:4.8, reviews:124,  cover:"https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&q=80",  images:[], description:"A masterpiece of Urdu literary history — a brilliant collection of poetry and criticism." },
  { id:"b2",  title:"Bang-e-Dra",            author:"Allama Iqbal",           category:"urdu-books",     price:950,  stock:25, featured:true,  rating:4.9, reviews:312,  cover:"https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&q=80",  images:[], description:"Iqbal's first celebrated poetry collection. Songs of love, philosophy and self-discovery." },
  { id:"b3",  title:"Seerat-un-Nabi ﷺ",     author:"Shibli Nomani",          category:"islamic-books",  price:2200, stock:8,  featured:true,  rating:5.0, reviews:547,  cover:"https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=500&q=80",  images:[], description:"Complete and authentic biography of the Prophet ﷺ — a landmark of Islamic scholarship." },
  { id:"b4",  title:"Tafheem-ul-Quran",      author:"Syed Abul A'la Maududi", category:"islamic-books",  price:3500, stock:6,  featured:true,  rating:4.9, reviews:891,  cover:"https://images.unsplash.com/photo-1585079542156-2755d9c8a094?w=500&q=80",  images:[], description:"Comprehensive Quran tafseer in clear accessible Urdu — the definitive modern commentary." },
  { id:"b5",  title:"Atomic Habits",         author:"James Clear",            category:"english-books",  price:1850, stock:30, featured:true,  rating:4.7, reviews:2134, cover:"https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&q=80",  images:[], description:"An easy and proven way to build good habits and break bad ones. #1 international bestseller." },
  { id:"b6",  title:"The Alchemist",         author:"Paulo Coelho",           category:"english-books",  price:1200, stock:18, featured:false, rating:4.6, reviews:1876, cover:"https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=500&q=80",  images:[], description:"A magical story about following your dream — one of the best-selling books of all time." },
  { id:"b7",  title:"Cinderella & Tales",    author:"Brothers Grimm",         category:"kids-corner",    price:750,  stock:22, featured:false, rating:4.5, reviews:432,  cover:"https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=500&q=80",  images:[], description:"Classic fairy tales beautifully illustrated for young readers." },
  { id:"b8",  title:"My First 100 Words",    author:"Roger Priddy",           category:"kids-corner",    price:650,  stock:35, featured:true,  rating:4.8, reviews:763,  cover:"https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=500&q=80",  images:[], description:"Bright colourful first picture book for toddlers — essential early learning." },
  { id:"b9",  title:"FSc Physics Part 1",    author:"Punjab Textbook Board",  category:"academic-books", price:480,  stock:50, featured:false, rating:4.3, reviews:567,  cover:"https://images.unsplash.com/photo-1532094349884-543559c2b866?w=500&q=80",  images:[], description:"Intermediate Physics Part 1 — official Punjab curriculum textbook for FSc students." },
  { id:"b10", title:"Oxford Dictionary",     author:"Oxford University Press", category:"academic-books", price:2950, stock:14, featured:true,  rating:4.9, reviews:1204, cover:"https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=500&q=80",  images:[], description:"The definitive English dictionary — essential for students and professionals." },
];

// In-memory data
let _db = { categories: [], books: [] };

// ── Firebase Helpers ─────────────────────────────────────────
async function fbGet(path) {
  const res = await fetch(`${FIREBASE_URL}/${path}.json`);
  if (!res.ok) throw new Error("Firebase read failed");
  return res.json();
}

async function fbSet(path, data) {
  const res = await fetch(`${FIREBASE_URL}/${path}.json`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Firebase write failed");
  return res.json();
}

async function fbPatch(path, data) {
  const res = await fetch(`${FIREBASE_URL}/${path}.json`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Firebase patch failed");
  return res.json();
}

async function fbDelete(path) {
  await fetch(`${FIREBASE_URL}/${path}.json`, { method: "DELETE" });
}

// ── Load Data ────────────────────────────────────────────────
// Tries Firebase first → falls back to localStorage cache
async function loadData() {
  try {
    const remote = await fbGet("data");
    if (remote && remote.books) {
      _db = remote;
      // Ensure arrays (Firebase stores arrays as objects)
      _db.books      = _db.books      ? Object.values(_db.books)      : [];
      _db.categories = _db.categories ? Object.values(_db.categories) : [];
      localStorage.setItem(LS.CACHE, JSON.stringify(_db));
      return;
    }
    throw new Error("empty");
  } catch {
    // Fallback: use cache or defaults
    const cache = localStorage.getItem(LS.CACHE);
    if (cache) {
      _db = JSON.parse(cache);
    } else {
      _db = { books: DEFAULT_BOOKS, categories: DEFAULT_CATEGORIES };
      // Try to seed Firebase in background
      fbSet("data", _db).catch(() => {});
    }
  }
}

// ── Store API ────────────────────────────────────────────────
const Store = {
  ready: loadData,

  // Books
  getBooks:    ()    => _db.books || [],
  getBook:     (id)  => (_db.books || []).find(b => b.id === id),
  getFeatured: ()    => (_db.books || []).filter(b => b.featured),

  addBook: async (book) => {
    book.id      = "b" + Date.now();
    book.rating  = book.rating  || 4.5;
    book.reviews = book.reviews || 0;
    book.images  = book.images  || [];
    _db.books.unshift(book);
    await fbSet("data/books", _arrToObj(_db.books));
    localStorage.setItem(LS.CACHE, JSON.stringify(_db));
  },

  updateBook: async (id, updates) => {
    const i = _db.books.findIndex(b => b.id === id);
    if (i < 0) return;
    _db.books[i] = { ..._db.books[i], ...updates };
    await fbSet("data/books", _arrToObj(_db.books));
    localStorage.setItem(LS.CACHE, JSON.stringify(_db));
  },

  deleteBook: async (id) => {
    _db.books = _db.books.filter(b => b.id !== id);
    await fbSet("data/books", _arrToObj(_db.books));
    localStorage.setItem(LS.CACHE, JSON.stringify(_db));
  },

  // Categories
  getCategories: () => _db.categories || [],

  addCategory: async (cat) => {
    if (_db.categories.find(c => c.slug === cat.slug)) return false;
    _db.categories.push(cat);
    await fbSet("data/categories", _arrToObj(_db.categories));
    localStorage.setItem(LS.CACHE, JSON.stringify(_db));
    return true;
  },

  deleteCategory: async (slug) => {
    _db.categories = _db.categories.filter(c => c.slug !== slug);
    _db.books = _db.books.map(b =>
      b.category === slug ? { ...b, category: "uncategorized" } : b
    );
    await fbSet("data", _db);
    localStorage.setItem(LS.CACHE, JSON.stringify(_db));
  },

  // Cart (per device — correct for e-commerce)
  getCart:    ()         => JSON.parse(localStorage.getItem(LS.CART) || "[]"),
  setCart:    (c)        => { localStorage.setItem(LS.CART, JSON.stringify(c)); window.dispatchEvent(new Event("cart-updated")); },
  addToCart:  (id, qty=1) => {
    const cart = Store.getCart();
    const ex   = cart.find(c => c.id === id);
    if (ex) ex.qty += qty; else cart.push({ id, qty });
    Store.setCart(cart);
  },
  updateCartQty: (id, qty) => {
    const cart = Store.getCart();
    const item = cart.find(c => c.id === id);
    if (!item) return;
    if (qty <= 0) Store.setCart(cart.filter(c => c.id !== id));
    else { item.qty = qty; Store.setCart(cart); }
  },
  removeFromCart: (id) => Store.setCart(Store.getCart().filter(c => c.id !== id)),
  clearCart:      ()   => Store.setCart([]),

  // Orders
  getOrders: () => JSON.parse(localStorage.getItem(LS.ORDERS) || "[]"),
  addOrder:  (order) => {
    const orders = Store.getOrders();
    order.created_at = new Date().toISOString();
    order.status     = "pending";
    orders.unshift(order);
    localStorage.setItem(LS.ORDERS, JSON.stringify(orders));
    return order;
  },
};

// Firebase needs object not array
function _arrToObj(arr) {
  const obj = {};
  arr.forEach((item, i) => { obj[item.id || i] = item; });
  return obj;
}

// ── Admin ────────────────────────────────────────────────────
async function sha256(text) {
  const buf  = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
}

const Admin = {
  isLoggedIn: () => sessionStorage.getItem(LS.ADMIN) === "1",
  login: async (u, p) => {
    const h = await sha256(`${u.trim()}:${p}`);
    if (h === ADMIN_HASH) { sessionStorage.setItem(LS.ADMIN,"1"); return true; }
    return false;
  },
  logout: () => { sessionStorage.removeItem(LS.ADMIN); location.reload(); },
};

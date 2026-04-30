// ================================================================
//  KitabGhar — app.js v4.0  (works with store.js + Firebase)
// ================================================================

const W3F_KEY = "af8db103-a5ae-4e0a-8d99-a61b79c2ec1e";

// ── Helpers ──────────────────────────────────────────────────
function Rs(n) { return "Rs. " + Number(n).toLocaleString("en-PK"); }
function slugify(s) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }

function starsHTML(r=4.5) {
  const f=Math.floor(r);
  return "★".repeat(f)+(r%1>=.5?"½":"")+"☆".repeat(5-f-(r%1>=.5?1:0));
}

function toast(msg, type="") {
  document.querySelectorAll(".toast").forEach(t=>t.remove());
  const t=document.createElement("div");
  t.className="toast "+type; t.textContent=msg;
  document.body.appendChild(t);
  requestAnimationFrame(()=>t.classList.add("show"));
  setTimeout(()=>{t.classList.remove("show");setTimeout(()=>t.remove(),400);},3000);
}

function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }

function updateCartBadge() {
  document.querySelectorAll(".cart-badge").forEach(b=>{
    const n=Store.getCart().reduce((s,i)=>s+i.qty,0);
    b.textContent=n; b.style.display=n>0?"flex":"none";
  });
}
window.addEventListener("cart-updated", updateCartBadge);

// ── Image Compress ────────────────────────────────────────────
async function compressImg(file, maxW=900, q=0.82) {
  const src = await new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=e=>res(e.target.result); r.onerror=rej;
    r.readAsDataURL(file);
  });
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement("canvas");
      let w=img.width,h=img.height;
      if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
      c.width=w;c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      res(c.toDataURL("image/jpeg",q));
    };
    img.src=src;
  });
}

// ── Book Card ─────────────────────────────────────────────────
// Click cover/title → product page | + Cart button → adds to cart
function bookCardHTML(book) {
  const isAdmin=Admin.isLoggedIn();
  const out=book.stock<=0;
  const cover=book.cover&&book.cover.trim()?book.cover:"";
  return `
  <article class="book-card">
    ${book.featured?'<span class="featured-tag">⭐ Featured</span>':""}
    ${isAdmin?`
      <div class="admin-btns">
        <button onclick="event.preventDefault();event.stopPropagation();editBook('${book.id}')" title="Edit">✏️</button>
        <button onclick="event.preventDefault();event.stopPropagation();delBook('${book.id}')" title="Delete">🗑️</button>
      </div>`:""}
    <a href="product.html?id=${book.id}" class="book-cover-wrap">
      ${cover?`<img src="${cover}" alt="${book.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:``}
      <div class="book-placeholder" style="${cover?'display:none':''}">📚</div>
    </a>
    <div class="book-info">
      <a href="product.html?id=${book.id}" style="text-decoration:none">
        <h3 class="book-title">${book.title}</h3>
      </a>
      <p class="book-author">${book.author||"Unknown"}</p>
      <div class="book-stars">
        <span class="stars">${starsHTML(book.rating||4.5)}</span>
        <span class="reviews">(${book.reviews||0})</span>
      </div>
      <div class="book-foot">
        <div>
          <div class="book-price">${Rs(book.price)}</div>
          <div class="book-stock ${out?'out':''}">${out?"✗ Out of stock":"✓ In stock"}</div>
        </div>
        <button class="btn-cart"
          onclick="event.preventDefault();event.stopPropagation();quickAdd('${book.id}')"
          ${out?"disabled":""}>
          ${out?"—":"+ Cart"}
        </button>
      </div>
    </div>
  </article>`;
}

function quickAdd(id) {
  const b=Store.getBook(id);
  if(!b||b.stock<=0) return;
  Store.addToCart(id,1);
  toast(`✓ "${b.title}" added to cart`,"ok");
}

// ── Admin Login ───────────────────────────────────────────────
function openAdminLogin() {
  if(Admin.isLoggedIn()){if(confirm("Edit Mode active. Logout?"))Admin.logout();return;}
  document.getElementById("login-overlay").classList.add("open");
  setTimeout(()=>document.getElementById("login-u")?.focus(),80);
}

async function handleLogin(e) {
  e.preventDefault();
  const u=document.getElementById("login-u").value;
  const p=document.getElementById("login-p").value;
  if(await Admin.login(u,p)){toast("✓ Edit Mode activated","ok");setTimeout(()=>location.reload(),600);}
  else toast("Incorrect username or password","fail");
}

// ── Book Form ─────────────────────────────────────────────────
function catOptionsHTML(sel="") {
  return Store.getCategories()
    .map(c=>`<option value="${c.slug}"${c.slug===sel?" selected":""}>${c.icon||"📚"} ${c.name}</option>`)
    .join("");
}

function openBookForm(book=null) {
  if(!Admin.isLoggedIn()) return;
  const isEdit=!!book;
  const html=`
  <div class="modal modal-lg">
    <div class="modal-head">
      <h3>${isEdit?"Edit Book":"Add New Book"}</h3>
      <button class="modal-close" onclick="closeModal('bk-overlay')">×</button>
    </div>
    <form id="bk-form" onsubmit="submitBook(event,'${isEdit?book.id:''}')" novalidate>
      <div class="form-group">
        <label>Title *</label>
        <input name="title" required placeholder="Book title" value="${book?.title||""}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Author</label>
          <input name="author" placeholder="Author name" value="${book?.author||""}">
        </div>
        <div class="form-group">
          <label>Price (Rs.) *</label>
          <input name="price" type="number" min="0" required value="${book?.price||0}">
        </div>
      </div>

      <div class="form-group">
        <label>Category *</label>
        <div style="display:flex;gap:.5rem;align-items:center">
          <select name="category" id="bk-cat" required style="flex:1">
            ${catOptionsHTML(book?.category||"")}
          </select>
          <button type="button" class="btn btn-ghost btn-sm"
            onclick="toggleNewCat()" style="white-space:nowrap;flex-shrink:0">+ New</button>
        </div>
        <div id="new-cat-box" style="display:none;margin-top:.7rem;padding:.9rem;background:var(--sand);border-radius:var(--radius-sm);border:1px solid var(--border)">
          <p style="font-size:.78rem;font-weight:700;color:var(--bark);margin-bottom:.6rem">Create New Category</p>
          <div class="form-row">
            <div class="form-group" style="margin:0">
              <label style="font-size:.75rem">Name *</label>
              <input id="nc-name" placeholder="e.g. History" oninput="document.getElementById('nc-slug').value=slugify(this.value)">
            </div>
            <div class="form-group" style="margin:0">
              <label style="font-size:.75rem">Icon (emoji)</label>
              <input id="nc-icon" maxlength="4" value="📚" style="text-align:center;font-size:1.1rem">
            </div>
          </div>
          <div class="form-group" style="margin:.4rem 0 .7rem">
            <label style="font-size:.75rem">Slug</label>
            <input id="nc-slug" placeholder="history-books" style="color:var(--muted2)">
          </div>
          <div style="display:flex;gap:.4rem">
            <button type="button" class="btn btn-primary btn-sm" onclick="createCat()">✓ Create</button>
            <button type="button" class="btn btn-ghost btn-sm" onclick="toggleNewCat()">Cancel</button>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Stock *</label>
          <input name="stock" type="number" min="0" required value="${book?.stock||0}">
        </div>
        <div class="form-group">
          <label>Rating (1–5)</label>
          <input name="rating" type="number" min="1" max="5" step="0.1" value="${book?.rating||4.5}">
        </div>
      </div>

      <div class="form-group">
        <label>Cover Image — Upload from device</label>
        <div class="img-upload-box" id="bk-cover-box" onclick="document.getElementById('bk-cover-file').click()" style="cursor:pointer">
          ${book?.cover
            ?`<img src="${book.cover}" style="max-height:140px;border-radius:8px;object-fit:cover">`
            :`<div style="text-align:center;color:var(--muted2)">
               <div style="font-size:2.5rem">📷</div>
               <p style="font-size:.8rem;margin:.3rem 0">Click to upload cover image</p>
               <p style="font-size:.72rem;opacity:.7">Works on Android & PC</p>
             </div>`}
        </div>
        <input type="file" id="bk-cover-file" accept="image/*" style="display:none" onchange="handleCoverFile(this)">
        <input type="hidden" id="bk-cover-val" name="cover" value="${book?.cover||""}">
      </div>

      <div class="form-group">
        <label>Additional Images <span style="color:var(--muted2);font-weight:400">(optional, max 4)</span></label>
        <div class="extra-imgs-row" id="bk-extra-row"></div>
        <input type="hidden" id="bk-extra-val" name="images" value='${JSON.stringify(book?.images||[])}'>
      </div>

      <div class="form-group">
        <label>Description</label>
        <textarea name="description" rows="3" placeholder="Book synopsis, topics covered...">${book?.description||""}</textarea>
      </div>

      <div class="form-group">
        <label style="display:flex;align-items:center;gap:.6rem;cursor:pointer;font-weight:400">
          <input type="checkbox" name="featured" style="width:17px;height:17px;accent-color:var(--bark);margin:0;flex-shrink:0" ${book?.featured?"checked":""}>
          <span><strong>Featured</strong> — show on homepage</span>
        </label>
      </div>

      <div style="display:flex;gap:.6rem;justify-content:flex-end;padding-top:.75rem;border-top:1px solid var(--border)">
        <button type="button" class="btn btn-ghost btn-sm" onclick="closeModal('bk-overlay')">Cancel</button>
        <button type="submit" class="btn btn-primary btn-sm" id="bk-save-btn">
          ${isEdit?"✓ Save Changes":"✓ Add Book"}
        </button>
      </div>
    </form>
  </div>`;

  let ov=document.getElementById("bk-overlay");
  if(!ov){ov=document.createElement("div");ov.id="bk-overlay";ov.className="overlay";ov.onclick=e=>{if(e.target===ov)closeModal("bk-overlay");};document.body.appendChild(ov);}
  ov.innerHTML=html;
  ov.classList.add("open");
  window._extraImgs=[...(book?.images||[])];
  renderExtraThumbs();
}

function toggleNewCat() {
  const b=document.getElementById("new-cat-box");
  b.style.display=b.style.display==="none"?"block":"none";
  if(b.style.display==="block")document.getElementById("nc-name")?.focus();
}

async function createCat() {
  const name=document.getElementById("nc-name").value.trim();
  const icon=document.getElementById("nc-icon").value.trim()||"📚";
  const slug=document.getElementById("nc-slug").value.trim()||slugify(name);
  if(!name){toast("Category name required","fail");return;}
  const btn=document.querySelector("#new-cat-box .btn-primary");
  btn.disabled=true;btn.textContent="Saving...";
  const ok=await Store.addCategory({slug,name,icon});
  btn.disabled=false;btn.textContent="✓ Create";
  if(!ok){toast("Category already exists","fail");return;}
  const sel=document.getElementById("bk-cat");
  sel.appendChild(new Option(`${icon} ${name}`,slug,true,true));
  document.getElementById("nc-name").value="";
  document.getElementById("nc-slug").value="";
  toggleNewCat();
  toast(`✓ "${name}" created`,"ok");
}

async function handleCoverFile(input) {
  if(!input.files[0])return;
  const btn=document.getElementById("bk-save-btn");
  btn.disabled=true;btn.textContent="Processing...";
  try{
    const data=await compressImg(input.files[0],900,0.82);
    document.getElementById("bk-cover-val").value=data;
    const box=document.getElementById("bk-cover-box");
    box.innerHTML=`<img src="${data}" style="max-height:140px;border-radius:8px;object-fit:cover">`;
    box.onclick=()=>document.getElementById("bk-cover-file").click();
  }catch{toast("Upload failed","fail");}
  btn.disabled=false;btn.textContent="✓ Save";
}

async function addExtraImg(input) {
  if(!input.files.length)return;
  if(window._extraImgs.length>=4){toast("Max 4 images","fail");return;}
  const btn=document.getElementById("bk-save-btn");
  btn.disabled=true;btn.textContent="Processing...";
  for(const f of input.files){
    if(window._extraImgs.length>=4)break;
    window._extraImgs.push(await compressImg(f,900,0.80));
  }
  renderExtraThumbs();
  btn.disabled=false;btn.textContent="✓ Save";
}

function removeExtra(i){window._extraImgs.splice(i,1);renderExtraThumbs();}

function renderExtraThumbs(){
  const row=document.getElementById("bk-extra-row");
  if(!row)return;
  row.innerHTML=window._extraImgs.map((src,i)=>`
    <div class="extra-thumb">
      <img src="${src}" alt="">
      <button type="button" class="rm" onclick="removeExtra(${i})">✕</button>
    </div>`).join("")+
    (window._extraImgs.length<4?`
      <label class="add-img-btn" title="Add image">
        +
        <input type="file" accept="image/*" style="display:none" onchange="addExtraImg(this)" multiple>
      </label>`:"");
  document.getElementById("bk-extra-val").value=JSON.stringify(window._extraImgs);
}

async function submitBook(e,id) {
  e.preventDefault();
  const btn=document.getElementById("bk-save-btn");
  btn.disabled=true;btn.textContent="Saving...";
  const fd=new FormData(e.target);
  let images=[];try{images=JSON.parse(fd.get("images")||"[]");}catch{}
  const book={
    title:fd.get("title").trim(),
    author:fd.get("author").trim(),
    category:fd.get("category"),
    price:Number(fd.get("price")),
    stock:Number(fd.get("stock")),
    rating:Number(fd.get("rating"))||4.5,
    cover:fd.get("cover")||"",
    description:fd.get("description").trim(),
    featured:fd.get("featured")==="on",
    images,
  };
  if(!book.title){toast("Title required","fail");btn.disabled=false;btn.textContent="✓ Save";return;}
  if(id){await Store.updateBook(id,book);toast("✓ Book updated — all devices will see the change!","ok");}
  else{await Store.addBook(book);toast("✓ Book added — visible on all devices!","ok");}
  closeModal("bk-overlay");
  setTimeout(()=>location.reload(),600);
}

function editBook(id){const b=Store.getBook(id);if(b)openBookForm(b);}

async function delBook(id){
  if(!Admin.isLoggedIn())return;
  const b=Store.getBook(id);
  if(!b||!confirm(`Delete "${b.title}"?\nThis cannot be undone.`))return;
  await Store.deleteBook(id);
  toast("Book deleted","ok");
  setTimeout(()=>location.reload(),400);
}

// ── Category Manager ──────────────────────────────────────────
function openCatManager(){
  if(!Admin.isLoggedIn())return;
  renderCatManager();
}

function renderCatManager(){
  const cats=Store.getCategories();
  const html=`
  <div class="modal">
    <div class="modal-head">
      <h3>🗂️ Categories</h3>
      <button class="modal-close" onclick="closeModal('cat-overlay')">×</button>
    </div>
    <div style="margin-bottom:1.25rem">
      ${cats.length===0?`<p style="color:var(--muted2);font-size:.875rem">No categories yet.</p>`:""}
      ${cats.map(c=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem .8rem;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:.4rem;background:var(--white)">
          <span>${c.icon||"📚"} <strong style="font-size:.875rem">${c.name}</strong>
            <span style="color:var(--muted2);font-size:.74rem;margin-left:.3rem">${c.slug}</span>
          </span>
          <button onclick="delCat('${c.slug}')"
            style="background:rgba(192,57,43,.1);color:var(--red);border:none;padding:.28rem .65rem;border-radius:var(--radius-sm);font-size:.76rem;cursor:pointer;font-family:inherit">
            Delete
          </button>
        </div>`).join("")}
    </div>
    <div style="background:var(--sand);border-radius:var(--radius-sm);padding:1rem;border:1px solid var(--border)">
      <p style="font-size:.8rem;font-weight:700;color:var(--bark);margin-bottom:.6rem">Add New Category</p>
      <div class="form-row">
        <div class="form-group" style="margin:0">
          <label style="font-size:.76rem">Name *</label>
          <input id="cm-name" placeholder="History Books" oninput="document.getElementById('cm-slug').value=slugify(this.value)">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:.76rem">Icon (emoji)</label>
          <input id="cm-icon" value="📚" maxlength="4" style="text-align:center;font-size:1.1rem">
        </div>
      </div>
      <div class="form-group" style="margin:.4rem 0 .7rem">
        <label style="font-size:.76rem">Slug</label>
        <input id="cm-slug" placeholder="history-books" style="color:var(--muted2)">
      </div>
      <button class="btn btn-primary btn-sm" onclick="cmAdd()">+ Add Category</button>
    </div>
  </div>`;
  let ov=document.getElementById("cat-overlay");
  if(!ov){ov=document.createElement("div");ov.id="cat-overlay";ov.className="overlay";ov.onclick=e=>{if(e.target===ov)closeModal("cat-overlay");};document.body.appendChild(ov);}
  ov.innerHTML=html;
  ov.classList.add("open");
}

async function delCat(slug){
  if(!confirm(`Delete "${slug}"?\nBooks will move to Uncategorized.`))return;
  await Store.deleteCategory(slug);
  toast("Deleted","ok");
  renderCatManager();
}

async function cmAdd(){
  const name=document.getElementById("cm-name").value.trim();
  const icon=document.getElementById("cm-icon").value.trim()||"📚";
  const slug=document.getElementById("cm-slug").value.trim()||slugify(name);
  if(!name){toast("Name required","fail");return;}
  const ok=await Store.addCategory({slug,name,icon});
  if(!ok){toast("Already exists","fail");return;}
  toast(`✓ "${name}" added`,"ok");
  renderCatManager();
}

// ── Header ────────────────────────────────────────────────────
function renderHeader(page=""){
  const n=Store.getCart().reduce((s,i)=>s+i.qty,0);
  return `
  <div class="announce-bar">
    📦 <strong>Free delivery</strong> on orders above Rs. 2,000
    <span class="sep">|</span> 🛡️ <strong>100% Original</strong> Books
    <span class="sep">|</span> 💵 <strong>Cash on Delivery</strong>
  </div>
  <header class="site-header">
    <div class="container">
      <div class="header-wrap">
        <a href="index.html" class="logo">
          <span class="logo-main">Kitab<span>Ghar</span></span>
          <span class="logo-sub">Pakistan's Bookstore</span>
        </a>
        <nav class="main-nav">
          <a href="index.html"      class="${page==="home"?"active":""}">Home</a>
          <a href="categories.html" class="${page==="books"?"active":""}">Books</a>
          <a href="about.html"      class="${page==="about"?"active":""}">About</a>
          <a href="contact.html"    class="${page==="contact"?"active":""}">Contact</a>
        </nav>
        <div class="header-right">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="search" placeholder="Search books, authors..."
              onkeyup="if(event.key==='Enter'&&this.value.trim())location.href='categories.html?q='+encodeURIComponent(this.value.trim())">
          </div>
          <a href="cart.html" class="hdr-btn" aria-label="Cart" style="position:relative">
            🛒
            <span class="cart-badge" style="display:${n>0?"flex":"none"}">${n}</span>
          </a>
          <button class="hdr-btn hamburger"
            onclick="document.getElementById('mob-menu').classList.toggle('open')">☰</button>
        </div>
      </div>
      <nav class="mobile-menu" id="mob-menu">
        <a href="index.html">Home</a>
        <a href="categories.html">Books</a>
        <a href="about.html">About</a>
        <a href="contact.html">Contact</a>
        <input type="search" placeholder="Search books..."
          onkeyup="if(event.key==='Enter'&&this.value.trim())location.href='categories.html?q='+encodeURIComponent(this.value.trim())">
      </nav>
    </div>
  </header>
  ${Admin.isLoggedIn()?`
    <div class="edit-banner on">
      ✏️ Edit Mode Active
      <button onclick="openBookForm()">+ Add Book</button>
      <button onclick="openCatManager()">🗂️ Categories</button>
      <button onclick="Admin.logout()">Logout</button>
    </div>`:""}`;
}

// ── Footer ────────────────────────────────────────────────────
function renderFooter(){
  const isAdmin=Admin.isLoggedIn();
  const cats=Store.getCategories();
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="index.html" class="footer-logo">Kitab<span>Ghar</span></a>
          <p class="footer-about">Pakistan's trusted online bookstore. Urdu, English, Islamic, Academic and Kids books — delivered with Cash on Delivery.</p>
          <div class="footer-socials">
            <a href="#" class="social-btn">f</a>
            <a href="#" class="social-btn">📷</a>
            <a href="#" class="social-btn">💬</a>
            <a href="#" class="social-btn">▶</a>
          </div>
        </div>
        <div>
          <h5>Categories</h5>
          <ul>
            ${cats.map(c=>`<li><a href="categories.html?cat=${c.slug}">${c.icon||""} ${c.name}</a></li>`).join("")}
          </ul>
        </div>
        <div>
          <h5>Quick Links</h5>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="categories.html">All Books</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact</a></li>
            <li><a href="cart.html">My Cart</a></li>
          </ul>
        </div>
        <div>
          <h5>Contact Us</h5>
          <div class="footer-contact-item"><span class="footer-contact-icon">📞</span>+92 300 0000000</div>
          <div class="footer-contact-item"><span class="footer-contact-icon">📧</span>hello@kitabghar.pk</div>
          <div class="footer-contact-item"><span class="footer-contact-icon">📍</span>Lahore, Pakistan</div>
          <div class="footer-contact-item"><span class="footer-contact-icon">🕐</span>Mon–Sat: 9am–7pm</div>
        </div>
      </div>
      <div class="footer-bottom">
        <span class="footer-copy">© ${new Date().getFullYear()} KitabGhar. All rights reserved.</span>
        <button class="admin-login-btn ${isAdmin?"active":""}" onclick="openAdminLogin()">
          ${isAdmin?"✓ Edit Mode ON":"🔒 Admin"}
        </button>
      </div>
    </div>
  </footer>

  <div class="overlay" id="login-overlay" onclick="if(event.target===this)closeModal('login-overlay')">
    <div class="modal">
      <div class="modal-head">
        <h3>🔒 Admin Login</h3>
        <button class="modal-close" onclick="closeModal('login-overlay')">×</button>
      </div>
      <p style="color:var(--muted2);font-size:.875rem;margin-bottom:1.25rem">Login to add, edit or delete books and categories.</p>
      <form onsubmit="handleLogin(event)">
        <div class="form-group">
          <label>Username</label>
          <input id="login-u" type="text" required autocomplete="username" placeholder="Enter username">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input id="login-p" type="password" required autocomplete="current-password" placeholder="••••••••">
        </div>
        <button type="submit" class="btn btn-primary btn-block">Login</button>
      </form>
    </div>
  </div>`;
}

// ── Mount ─────────────────────────────────────────────────────
function mountLayout(page=""){
  document.getElementById("site-header").innerHTML=renderHeader(page);
  document.getElementById("site-footer").innerHTML=renderFooter();
  updateCartBadge();
}

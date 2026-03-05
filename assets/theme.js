document.addEventListener('DOMContentLoaded', () => {
  // ─── Cart Drawer ───────────────────────────────────────────
  refreshCartDrawer();

  // ─── Scroll Reveal (IntersectionObserver) ─────────────────
  const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if (revealEls.length > 0 && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: show everything immediately
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // Intercept all add-to-cart forms
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[action="/cart/add"]');
    if (!form) return;
    e.preventDefault();

    const formData = new FormData(form);
    try {
      await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      await refreshCartDrawer();
      openCartDrawer();
    } catch (err) {
      console.error('Add to cart failed', err);
    }
  });
});

// ─── Cart Drawer open / close ─────────────────────────────
function openCartDrawer() {
  const drawer = document.getElementById('CartDrawer');
  const overlay = document.getElementById('CartDrawerOverlay');
  if (!drawer || !overlay) return;
  drawer.classList.remove('translate-x-full');
  drawer.classList.add('translate-x-0');
  overlay.classList.remove('opacity-0', 'pointer-events-none');
  overlay.classList.add('opacity-100', 'pointer-events-auto');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const drawer = document.getElementById('CartDrawer');
  const overlay = document.getElementById('CartDrawerOverlay');
  if (!drawer || !overlay) return;
  drawer.classList.add('translate-x-full');
  drawer.classList.remove('translate-x-0');
  overlay.classList.add('opacity-0', 'pointer-events-none');
  overlay.classList.remove('opacity-100', 'pointer-events-auto');
  document.body.style.overflow = '';
}

async function refreshCartDrawer() {
  try {
    const res = await fetch('/cart.js');
    const cart = await res.json();
    renderCartDrawer(cart);
    updateCartBadge(cart.item_count);
  } catch (err) {
    console.error('Failed to fetch cart', err);
  }
}

function renderCartDrawer(cart) {
  const emptyEl = document.getElementById('CartEmpty');
  const itemsEl = document.getElementById('CartItems');
  const footerEl = document.getElementById('CartFooter');
  const subtotalEl = document.getElementById('CartSubtotal');

  if (!emptyEl || !itemsEl || !footerEl) return;

  if (cart.item_count === 0) {
    emptyEl.classList.remove('hidden');
    itemsEl.classList.add('hidden');
    footerEl.classList.add('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  itemsEl.classList.remove('hidden');
  footerEl.classList.remove('hidden');

  subtotalEl.textContent = formatMoney(cart.total_price);

  itemsEl.innerHTML = cart.items.map(item => `
    <div class="flex gap-4 items-start" data-line-key="${item.key}">
      <div class="w-20 h-20 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
        <img src="${item.image || ''}" alt="${item.title}" class="w-full h-full object-cover">
      </div>
      <div class="flex-grow min-w-0">
        <h4 class="text-sm font-medium truncate">${item.product_title}</h4>
        ${item.variant_title ? `<p class="text-xs text-muted-foreground mt-0.5">${item.variant_title}</p>` : ''}
        <p class="text-primary text-sm font-medium mt-1">${formatMoney(item.final_line_price)}</p>
        <div class="flex items-center gap-3 mt-2">
          <button onclick="updateCartItem('${item.key}', ${item.quantity - 1})" class="text-muted-foreground hover:text-white text-xs w-6 h-6 flex items-center justify-center border border-white/10 rounded">&minus;</button>
          <span class="text-sm font-medium w-4 text-center">${item.quantity}</span>
          <button onclick="updateCartItem('${item.key}', ${item.quantity + 1})" class="text-muted-foreground hover:text-white text-xs w-6 h-6 flex items-center justify-center border border-white/10 rounded">&plus;</button>
          <button onclick="updateCartItem('${item.key}', 0)" class="ml-auto text-muted-foreground hover:text-red-400 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function updateCartItem(key, quantity) {
  try {
    await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity })
    });
    await refreshCartDrawer();
  } catch (err) {
    console.error('Cart update failed', err);
  }
}

function updateCartBadge(count) {
  const badge = document.getElementById('CartBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function formatMoney(cents) {
  return '₹' + (cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Shop Tab Filtering ──────────────────────────────────────
function filterProducts(tab, btn) {
  const cards = document.querySelectorAll('[data-product-type]');
  const buttons = document.querySelectorAll('[data-filter-tab]');

  // Update active tab styling
  buttons.forEach(b => {
    b.classList.remove('bg-primary', 'text-primary-foreground');
    b.classList.add('text-muted-foreground');
  });
  btn.classList.add('bg-primary', 'text-primary-foreground');
  btn.classList.remove('text-muted-foreground');

  // Filter cards
  cards.forEach(card => {
    if (tab === 'all') {
      card.style.display = '';
    } else {
      const type = (card.getAttribute('data-product-type') || '').toLowerCase();
      card.style.display = type.includes(tab.toLowerCase()) ? '' : 'none';
    }
  });
}

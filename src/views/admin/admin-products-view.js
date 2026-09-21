import { fetchProducts, saveProduct, deleteProduct, fetchStoreSettings } from '../../services/supabase.js';

export async function renderAdminProductsView(container, state, events) {
  let products = await fetchProducts();
  const settings = await fetchStoreSettings();
  const currency = settings.currency || 'Rs.';

  let searchQuery = '';
  let selectedCategory = 'All';
  let editingProduct = null;
  let isModalOpen = false;

  function getFilteredProducts() {
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }

  function render() {
    const list = getFilteredProducts();
    const categories = ['All', 'Seatings', 'Surfaces', 'Decorations', 'Greens', 'Long Sofa', 'Combos'];

    container.innerHTML = `
      <div>
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <h1 style="font-size: 1.85rem; font-weight: 800; color: var(--color-primary); letter-spacing: -0.02em;">
              Products Catalog Database
            </h1>
            <p style="font-size: 0.9rem; color: var(--color-text-muted);">
              Manage inventory, pricing, specifications, and gallery assets.
            </p>
          </div>

          <button class="btn btn-primary" id="btn-add-product">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add New Furniture</span>
          </button>
        </div>

        <!-- Controls: Search & Category Pills -->
        <div class="admin-card" style="padding: 18px 24px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
            <div style="position: relative; max-width: 320px; width: 100%;">
              <input 
                type="text" 
                class="settings-input" 
                id="product-search-input" 
                placeholder="Search by name, ID, or tag..." 
                value="${searchQuery}"
                style="padding-left: 38px;"
              >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--color-text-subtle);">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${categories.map(cat => `
                <button class="filter-pill ${selectedCategory === cat ? 'active' : ''} product-cat-filter" data-cat="${cat}">
                  ${cat}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Products Table -->
        <div class="admin-card">
          <div class="admin-card-header">
            <h2 class="admin-card-title">All Catalog Items (${list.length})</h2>
            <div style="font-size: 0.82rem; color: var(--color-text-muted);">
              Changes sync automatically to local storage and connected Supabase
            </div>
          </div>

          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Dimensions & Specs</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${list.length > 0 ? list.map(p => `
                  <tr>
                    <td>
                      <div class="product-row-flex">
                        <img src="${p.image}" alt="${p.name}" class="product-table-thumb">
                        <div>
                          <div style="font-weight: 700; color: var(--color-primary);">${p.name}</div>
                          <div style="font-size: 0.75rem; color: var(--color-text-subtle);">ID: ${p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge-tag" style="background: var(--color-bg-light); color: var(--color-primary); border: 1px solid rgba(18,45,37,0.15);">
                        ${p.category}
                      </span>
                    </td>
                    <td>
                      <strong>${currency} ${p.price.toLocaleString()}</strong>
                      ${p.originalPrice ? `<div style="font-size: 0.76rem; color: var(--color-text-subtle); text-decoration: line-through;">${currency} ${p.originalPrice.toLocaleString()}</div>` : ''}
                    </td>
                    <td>
                      <div style="font-size: 0.8rem; color: var(--color-text-muted);">
                        ${p.materials || 'Standard wood/metal'} • ${p.dimensions || 'Standard size'}
                      </div>
                    </td>
                    <td>
                      <span class="status-badge ${p.inStock !== false ? 'delivered' : 'cancelled'}">
                        ${p.inStock !== false ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 8px;">
                        <button class="action-icon-btn btn-edit-product" data-id="${p.id}" title="Edit product details">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button class="action-icon-btn danger btn-delete-product" data-id="${p.id}" title="Delete product">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 48px 20px; color: var(--color-text-muted);">
                      No matching products found. Try changing your search query or filter.
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Add / Edit Modal -->
        <div class="admin-modal-backdrop ${isModalOpen ? 'open' : ''}" id="product-modal">
          <div class="admin-modal-card">
            <div class="admin-modal-header">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary);">
                ${editingProduct ? 'Edit Furniture Piece' : 'Add New Furniture to Catalog'}
              </h3>
              <button class="btn-icon" id="btn-close-modal" style="font-size: 1.2rem;">✕</button>
            </div>

            <form id="product-edit-form" class="admin-modal-body">
              <div class="settings-form-grid">
                <div class="settings-form-group">
                  <label class="settings-label" for="form-p-id">Product ID / Slug *</label>
                  <input type="text" id="form-p-id" class="settings-input" placeholder="e.g. argo-office-chair" required ${editingProduct ? 'readonly style="background:#f5f5f5;"' : ''}>
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="form-p-name">Product Name *</label>
                  <input type="text" id="form-p-name" class="settings-input" placeholder="e.g. Argo Office Chair" required>
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="form-p-cat">Category *</label>
                  <select id="form-p-cat" class="settings-select" required>
                    <option value="Seatings">Seatings</option>
                    <option value="Surfaces">Surfaces</option>
                    <option value="Decorations">Decorations</option>
                    <option value="Greens">Greens</option>
                    <option value="Long Sofa">Long Sofa</option>
                    <option value="Combos">Combos</option>
                  </select>
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="form-p-price">Price (NPR) *</label>
                  <input type="number" id="form-p-price" class="settings-input" placeholder="15000" min="0" required>
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="form-p-orig-price">Original Price (Strikethrough NPR)</label>
                  <input type="number" id="form-p-orig-price" class="settings-input" placeholder="18500" min="0">
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="form-p-badge">Badge Label</label>
                  <input type="text" id="form-p-badge" class="settings-input" placeholder="e.g. Best Seller, New Arrival, Trending">
                </div>

                <div class="settings-form-group full-width">
                  <label class="settings-label" for="form-p-image">Primary Image URL or Path *</label>
                  <input type="text" id="form-p-image" class="settings-input" placeholder="/images/product-argo-chair.png" required>
                </div>

                <div class="settings-form-group full-width">
                  <label class="settings-label" for="form-p-desc">Description</label>
                  <textarea id="form-p-desc" class="settings-textarea" rows="3" placeholder="Detailed product description..."></textarea>
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="form-p-materials">Materials</label>
                  <input type="text" id="form-p-materials" class="settings-input" placeholder="e.g. PU Leather, Metal Frame">
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="form-p-dimensions">Dimensions</label>
                  <input type="text" id="form-p-dimensions" class="settings-input" placeholder="e.g. 85cm, 65cm, 45cm">
                </div>

                <div class="settings-form-group">
                  <label class="settings-label" for="form-p-weight">Weight</label>
                  <input type="text" id="form-p-weight" class="settings-input" placeholder="e.g. 22kg">
                </div>

                <div class="settings-form-group">
                  <label class="settings-label">Stock Status</label>
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 8px;">
                    <input type="checkbox" id="form-p-instock" checked style="width: 18px; height: 18px;">
                    <span style="font-weight: 600; font-size: 0.9rem;">Product is Available in Stock</span>
                  </label>
                </div>
              </div>

              <div class="admin-modal-footer" style="margin-top: 24px; padding: 0;">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-modal">Cancel</button>
                <button type="submit" class="btn btn-primary btn-sm">Save to Database</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Search input
    const searchInput = container.querySelector('#product-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    // Category pills
    container.querySelectorAll('.product-cat-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCategory = btn.dataset.cat;
        render();
      });
    });

    // Open add modal
    const addBtn = container.querySelector('#btn-add-product');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        editingProduct = null;
        isModalOpen = true;
        render();
        populateModal(null);
      });
    }

    // Edit button click
    container.querySelectorAll('.btn-edit-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const prod = products.find(p => p.id === id);
        if (prod) {
          editingProduct = prod;
          isModalOpen = true;
          render();
          populateModal(prod);
        }
      });
    });

    // Delete button click
    container.querySelectorAll('.btn-delete-product').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm(`Are you sure you want to permanently delete "${id}" from the database?`)) {
          await deleteProduct(id);
          events.emit('toast', { message: `Product "${id}" deleted from database`, type: 'info' });
          products = await fetchProducts();
          render();
        }
      });
    });

    // Close modal handlers
    const closeBtn = container.querySelector('#btn-close-modal');
    const cancelBtn = container.querySelector('#btn-cancel-modal');
    const modalBackdrop = container.querySelector('#product-modal');

    [closeBtn, cancelBtn].forEach(el => {
      if (el) el.addEventListener('click', () => {
        isModalOpen = false;
        editingProduct = null;
        render();
      });
    });

    // Form submission
    const form = container.querySelector('#product-edit-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newProd = {
          id: container.querySelector('#form-p-id').value.trim(),
          name: container.querySelector('#form-p-name').value.trim(),
          category: container.querySelector('#form-p-cat').value,
          price: Number(container.querySelector('#form-p-price').value),
          originalPrice: Number(container.querySelector('#form-p-orig-price').value) || undefined,
          badge: container.querySelector('#form-p-badge').value.trim() || undefined,
          image: container.querySelector('#form-p-image').value.trim(),
          description: container.querySelector('#form-p-desc').value.trim(),
          materials: container.querySelector('#form-p-materials').value.trim(),
          dimensions: container.querySelector('#form-p-dimensions').value.trim(),
          weight: container.querySelector('#form-p-weight').value.trim(),
          inStock: container.querySelector('#form-p-instock').checked,
          rating: editingProduct?.rating || 5,
          reviewCount: editingProduct?.reviewCount || 0,
          gallery: editingProduct?.gallery || [container.querySelector('#form-p-image').value.trim()],
          colors: editingProduct?.colors || [{ name: 'Default', hex: '#122d25' }]
        };

        await saveProduct(newProd);
        events.emit('toast', { 
          message: `Product "${newProd.name}" successfully saved to database!`, 
          type: 'success' 
        });
        isModalOpen = false;
        editingProduct = null;
        products = await fetchProducts();
        render();
      });
    }
  }

  function populateModal(prod) {
    if (!prod) return;
    const q = id => container.querySelector(id);
    if (q('#form-p-id')) q('#form-p-id').value = prod.id || '';
    if (q('#form-p-name')) q('#form-p-name').value = prod.name || '';
    if (q('#form-p-cat')) q('#form-p-cat').value = prod.category || 'Seatings';
    if (q('#form-p-price')) q('#form-p-price').value = prod.price || '';
    if (q('#form-p-orig-price')) q('#form-p-orig-price').value = prod.originalPrice || '';
    if (q('#form-p-badge')) q('#form-p-badge').value = prod.badge || '';
    if (q('#form-p-image')) q('#form-p-image').value = prod.image || '';
    if (q('#form-p-desc')) q('#form-p-desc').value = prod.description || '';
    if (q('#form-p-materials')) q('#form-p-materials').value = prod.materials || '';
    if (q('#form-p-dimensions')) q('#form-p-dimensions').value = prod.dimensions || '';
    if (q('#form-p-weight')) q('#form-p-weight').value = prod.weight || '';
    if (q('#form-p-instock')) q('#form-p-instock').checked = prod.inStock !== false;
  }

  render();
}

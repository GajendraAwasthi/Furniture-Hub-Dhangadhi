import { fetchProducts, saveProduct, deleteProduct, fetchStoreSettings } from '../../services/supabase.js';
import { resolveCloudImageUrl, parseBulkImageUrls, uploadProductImage } from '../../utils/cloud-image-resolver.js';
import { escapeHtml } from '../../utils/security.js';
import { getBrandLoaderHtml } from '../../components/brand-loader.js';

export async function renderAdminProductsView(container, state, events) {
  container.innerHTML = getBrandLoaderHtml({
    title: 'Products Inventory',
    text: 'Loading furniture catalog & inventory items...',
    subtext: 'Furniture Hub Dhangadhi Cloud Database',
    size: 'md',
    minHeight: '380px'
  });

  let products = await fetchProducts();
  const settings = await fetchStoreSettings();
  const currency = settings.currency || 'Rs.';

  let searchQuery = '';
  let selectedCategory = 'All';
  let editingProduct = null;
  let isModalOpen = false;
  let currentGallery = [];

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

  function renderGalleryPreview() {
    const galleryContainer = container.querySelector('#gallery-preview-container');
    const countBadge = container.querySelector('#gallery-count-badge');
    const primaryInput = container.querySelector('#form-p-image');

    if (countBadge) {
      countBadge.textContent = `${currentGallery.length} ${currentGallery.length === 1 ? 'Image' : 'Images'}`;
    }

    if (primaryInput) {
      primaryInput.value = currentGallery[0] || '';
    }

    if (!galleryContainer) return;

    if (currentGallery.length === 0) {
      galleryContainer.innerHTML = `
        <div style="text-align: center; padding: 24px 16px; background: #ffffff; border: 1px dashed rgba(18,45,37,0.2); border-radius: 10px; color: var(--color-text-subtle); font-size: 0.88rem;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="margin: 0 auto 6px auto; display: block; opacity: 0.6;">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          No product images added yet. Upload files or paste Google Drive / Cloud links above.
        </div>
      `;
      return;
    }

    galleryContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px;">
        ${currentGallery.map((imgUrl, idx) => {
          const isCover = idx === 0;
          const displayUrl = resolveCloudImageUrl(imgUrl);
          let sourceLabel = 'Web URL';
          if (imgUrl.includes('drive.google.com') || imgUrl.includes('docs.google.com')) sourceLabel = 'Google Drive';
          else if (imgUrl.includes('dropbox.com')) sourceLabel = 'Dropbox';
          else if (imgUrl.startsWith('data:')) sourceLabel = 'Uploaded File';
          else if (imgUrl.includes('supabase.co')) sourceLabel = 'Cloud Storage';

          return `
            <div class="gallery-item-card" style="position: relative; border-radius: 10px; overflow: hidden; background: #ffffff; border: ${isCover ? '2px solid var(--color-primary)' : '1px solid rgba(18,45,37,0.15)'}; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; flex-direction: column;">
              <!-- Image Thumbnail -->
              <div style="position: relative; height: 110px; background: #f5f5f5; overflow: hidden;">
                <img src="${displayUrl}" alt="Gallery angle ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='/images/hero-living-room.png'">
                
                ${isCover ? `
                  <span style="position: absolute; top: 6px; left: 6px; background: var(--color-primary); color: #ffffff; font-size: 0.68rem; font-weight: 800; padding: 2px 7px; border-radius: 6px; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                    ★ COVER
                  </span>
                ` : ''}

                <!-- Remove Button -->
                <button type="button" class="btn-remove-gallery-img" data-index="${idx}" title="Remove image" style="position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #ffffff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; line-height: 1; transition: background 0.15s ease;">
                  ✕
                </button>
              </div>

              <!-- Item Controls -->
              <div style="padding: 6px; background: #fafafa; border-top: 1px solid rgba(18,45,37,0.08); font-size: 0.7rem; display: flex; flex-direction: column; gap: 4px;">
                <div style="color: var(--color-text-subtle); font-size: 0.68rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${sourceLabel}">
                  ${sourceLabel}
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 2px;">
                  <div style="display: flex; gap: 2px;">
                    <button type="button" class="btn-reorder-img" data-dir="left" data-index="${idx}" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Move left" style="padding: 2px 6px; font-size: 0.75rem; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer;">
                      ◀
                    </button>
                    <button type="button" class="btn-reorder-img" data-dir="right" data-index="${idx}" ${idx === currentGallery.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} title="Move right" style="padding: 2px 6px; font-size: 0.75rem; border: 1px solid #ddd; background: #fff; border-radius: 4px; cursor: pointer;">
                      ▶
                    </button>
                  </div>

                  ${!isCover ? `
                    <button type="button" class="btn-make-cover" data-index="${idx}" style="padding: 2px 6px; font-size: 0.65rem; font-weight: 700; color: var(--color-primary); background: rgba(18,45,37,0.06); border: 1px solid rgba(18,45,37,0.15); border-radius: 4px; cursor: pointer;">
                      Make Cover
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Attach interaction handlers
    galleryContainer.querySelectorAll('.btn-remove-gallery-img').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        if (!isNaN(index) && index >= 0 && index < currentGallery.length) {
          currentGallery.splice(index, 1);
          renderGalleryPreview();
        }
      });
    });

    galleryContainer.querySelectorAll('.btn-make-cover').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        if (!isNaN(index) && index > 0 && index < currentGallery.length) {
          const item = currentGallery.splice(index, 1)[0];
          currentGallery.unshift(item);
          renderGalleryPreview();
        }
      });
    });

    galleryContainer.querySelectorAll('.btn-reorder-img').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        const dir = btn.dataset.dir;
        if (dir === 'left' && index > 0) {
          const temp = currentGallery[index - 1];
          currentGallery[index - 1] = currentGallery[index];
          currentGallery[index] = temp;
          renderGalleryPreview();
        } else if (dir === 'right' && index < currentGallery.length - 1) {
          const temp = currentGallery[index + 1];
          currentGallery[index + 1] = currentGallery[index];
          currentGallery[index] = temp;
          renderGalleryPreview();
        }
      });
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
                value="${escapeHtml(searchQuery)}"
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
                  <th>Gallery</th>
                  <th>Dimensions & Specs</th>
                  <th>Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${list.length > 0 ? list.map(p => {
                  const galleryCount = Array.isArray(p.gallery) ? p.gallery.length : (p.image ? 1 : 0);
                  const displayThumb = resolveCloudImageUrl(p.image);
                  return `
                    <tr>
                      <td>
                        <div class="product-row-flex">
                          <img src="${displayThumb}" alt="${p.name}" class="product-table-thumb" onerror="this.src='/images/hero-living-room.png'">
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
                        <span class="badge-tag" style="font-size: 0.75rem; font-weight: 700; background: rgba(18,45,37,0.06); color: var(--color-primary);">
                          📷 ${galleryCount} ${galleryCount === 1 ? 'image' : 'images'}
                        </span>
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
                  `;
                }).join('') : `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 48px 16px;">
                      <div style="font-size: 1.1rem; font-weight: 700; color: var(--color-primary); margin-bottom: 6px;">No products in database yet</div>
                      <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 16px;">Add your first furniture product to populate the storefront catalog.</div>
                      <button class="btn btn-primary btn-sm" id="btn-empty-add-product">Add Product Now</button>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Add / Edit Product Modal -->
        <div class="modal-backdrop ${isModalOpen ? 'open' : ''}" id="product-modal">
          <div class="modal-card" style="max-width: 780px; width: 95%; max-height: 92vh; overflow-y: auto;">
            <div class="admin-modal-header" style="position: sticky; top: 0; background: #ffffff; z-index: 10; padding: 18px 24px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between;">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary);">
                ${editingProduct ? 'Edit Furniture Piece' : 'Add New Furniture Piece'}
              </h3>
              <button class="modal-close-btn" id="btn-close-modal" aria-label="Close modal">✕</button>
            </div>

            <form id="product-edit-form" class="admin-modal-body" style="padding: 24px;">
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

                <!-- ENTERPRISE PRODUCT IMAGE MANAGEMENT SYSTEM -->
                <div class="settings-form-group full-width" style="background: rgba(18, 45, 37, 0.03); border: 1.5px dashed rgba(18, 45, 37, 0.18); border-radius: 14px; padding: 20px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                    <div>
                      <label class="settings-label" style="font-size: 1rem; font-weight: 800; color: var(--color-primary); margin-bottom: 2px;">
                        High-Quality Product Images & Cloud Assets
                      </label>
                      <span style="font-size: 0.82rem; color: var(--color-text-subtle);">
                        Upload multiple files directly or paste Google Drive / Cloud links. The first image is the catalog cover.
                      </span>
                    </div>
                    <span class="badge-tag" id="gallery-count-badge" style="font-weight: 700; background: var(--color-primary); color: #ffffff;">
                      ${currentGallery.length} ${currentGallery.length === 1 ? 'Image' : 'Images'}
                    </span>
                  </div>

                  <!-- Dual Mode: File Uploader & Cloud Link Adder -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 18px;">
                    <!-- Dropzone / Multi-File Uploader -->
                    <div id="image-drop-zone" style="border: 2px dashed rgba(18, 45, 37, 0.22); background: #ffffff; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease;">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color: var(--color-primary); margin: 0 auto 8px auto; display: block;">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <div style="font-size: 0.88rem; font-weight: 700; color: var(--color-primary); margin-bottom: 4px;">Upload Image Files</div>
                      <div style="font-size: 0.76rem; color: var(--color-text-subtle); margin-bottom: 12px;">Drag & drop multiple files here or click below</div>
                      <label for="form-p-bulk-files" class="btn btn-secondary btn-sm" style="cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
                        <span>Choose Multiple Files</span>
                      </label>
                      <input type="file" id="form-p-bulk-files" accept="image/*" multiple style="display: none;">
                    </div>

                    <!-- Cloud Link & Google Drive Textbox -->
                    <div style="background: #ffffff; border: 1px solid rgba(18, 45, 37, 0.15); border-radius: 12px; padding: 16px; display: flex; flex-direction: column;">
                      <div style="font-size: 0.88rem; font-weight: 700; color: var(--color-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        <span>Google Drive & Cloud Links</span>
                      </div>
                      <div style="font-size: 0.76rem; color: var(--color-text-subtle); margin-bottom: 8px;">
                        Paste Google Drive share links, Dropbox, or web URLs (one per line or comma-separated):
                      </div>
                      <textarea id="form-p-cloud-links" class="settings-textarea" rows="2" placeholder="https://drive.google.com/file/d/1A2b3C.../view&#10;https://images.unsplash.com/..." style="font-size: 0.82rem; margin-bottom: 8px; resize: vertical;"></textarea>
                      <button type="button" class="btn btn-secondary btn-sm" id="btn-add-cloud-links" style="align-self: flex-end; font-weight: 700;">
                        + Add Cloud Links
                      </button>
                    </div>
                  </div>

                  <!-- Real-Time Gallery Preview Container -->
                  <div>
                    <div style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary); margin-bottom: 8px;">
                      Product Gallery Preview:
                    </div>
                    <div id="gallery-preview-container">
                      <!-- Rendered by renderGalleryPreview() -->
                    </div>
                  </div>

                  <!-- Hidden primary input for fallback/validation -->
                  <input type="hidden" id="form-p-image" required>
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

    // Initialize gallery preview
    renderGalleryPreview();

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
        currentGallery = [];
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
          currentGallery = Array.isArray(prod.gallery) && prod.gallery.length > 0 
            ? [...prod.gallery] 
            : (prod.image ? [prod.image] : []);
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
          try {
            await deleteProduct(id);
            events.emit('toast', { message: `Product "${id}" deleted from database`, type: 'info' });
            products = await fetchProducts();
            state.products = products;
            events.emit('products-updated', products);
            render();
          } catch (err) {
            console.error('Failed to delete product:', err);
            events.emit('toast', { message: `Failed to delete product: ${err.message}`, type: 'danger' });
          }
        }
      });
    });

    // Close modal handlers
    const closeBtn = container.querySelector('#btn-close-modal');
    const cancelBtn = container.querySelector('#btn-cancel-modal');

    [closeBtn, cancelBtn].forEach(el => {
      if (el) el.addEventListener('click', () => {
        isModalOpen = false;
        editingProduct = null;
        currentGallery = [];
        render();
      });
    });

    // Handle Bulk Cloud Links Addition
    const addCloudBtn = container.querySelector('#btn-add-cloud-links');
    const cloudTextarea = container.querySelector('#form-p-cloud-links');

    if (addCloudBtn && cloudTextarea) {
      addCloudBtn.addEventListener('click', () => {
        const text = cloudTextarea.value.trim();
        if (!text) {
          events.emit('toast', { message: 'Please enter at least one valid cloud URL or Google Drive link.', type: 'danger' });
          return;
        }
        const parsed = parseBulkImageUrls(text);
        if (parsed.length === 0) {
          events.emit('toast', { message: 'No valid image URLs found in the pasted text.', type: 'danger' });
          return;
        }

        parsed.forEach(item => {
          if (!currentGallery.includes(item.resolved)) {
            currentGallery.push(item.resolved);
          }
        });

        cloudTextarea.value = '';
        renderGalleryPreview();
        events.emit('toast', { message: `Added ${parsed.length} cloud images to product gallery!`, type: 'success' });
      });
    }

    // Handle Bulk File Upload & Drag & Drop
    const fileInput = container.querySelector('#form-p-bulk-files');
    const dropZone = container.querySelector('#image-drop-zone');

    async function handleFiles(files) {
      if (!files || files.length === 0) return;
      events.emit('show-brand-loader', { text: `Processing & optimizing ${files.length} image files...` });
      
      const productId = container.querySelector('#form-p-id')?.value?.trim() || 'product';
      let addedCount = 0;

      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith('image/')) continue;
          try {
            const uploaded = await uploadProductImage(file, productId);
            if (uploaded?.url && !currentGallery.includes(uploaded.url)) {
              currentGallery.push(uploaded.url);
              addedCount++;
            }
          } catch (err) {
            console.warn('Error uploading image file:', err);
          }
        }
      } finally {
        events.emit('hide-brand-loader');
      }

      renderGalleryPreview();
      if (addedCount > 0) {
        events.emit('toast', { message: `Successfully added ${addedCount} images to gallery!`, type: 'success' });
      }
    }

    if (fileInput) {
      fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = ''; // Reset for re-selection
      });
    }

    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--color-primary)';
        dropZone.style.background = 'rgba(18,45,37,0.04)';
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(18, 45, 37, 0.22)';
        dropZone.style.background = '#ffffff';
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(18, 45, 37, 0.22)';
        dropZone.style.background = '#ffffff';
        if (e.dataTransfer && e.dataTransfer.files) {
          handleFiles(e.dataTransfer.files);
        }
      });
    }

    // Form submission
    const form = container.querySelector('#product-edit-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const primaryImage = currentGallery[0] || '/images/hero-living-room.png';
        const finalGallery = currentGallery.length > 0 ? [...currentGallery] : [primaryImage];

        const newProd = {
          id: container.querySelector('#form-p-id').value.trim(),
          name: container.querySelector('#form-p-name').value.trim(),
          category: container.querySelector('#form-p-cat').value,
          price: Number(container.querySelector('#form-p-price').value),
          originalPrice: Number(container.querySelector('#form-p-orig-price').value) || undefined,
          badge: container.querySelector('#form-p-badge').value.trim() || undefined,
          image: primaryImage,
          gallery: finalGallery,
          description: container.querySelector('#form-p-desc').value.trim(),
          materials: container.querySelector('#form-p-materials').value.trim(),
          dimensions: container.querySelector('#form-p-dimensions').value.trim(),
          weight: container.querySelector('#form-p-weight').value.trim(),
          inStock: container.querySelector('#form-p-instock').checked,
          rating: editingProduct?.rating || 5,
          reviewCount: editingProduct?.reviewCount || 0,
          colors: editingProduct?.colors || [{ name: 'Default', hex: '#122d25' }]
        };

        try {
          await saveProduct(newProd);
          events.emit('toast', { 
            message: `Product "${newProd.name}" with ${finalGallery.length} gallery images saved successfully!`, 
            type: 'success' 
          });
          isModalOpen = false;
          editingProduct = null;
          currentGallery = [];
          products = await fetchProducts();
          state.products = products;
          events.emit('products-updated', products);
          render();
        } catch (err) {
          console.error('Failed to save product:', err);
          events.emit('toast', { 
            message: `Failed to save product: ${err.message}`, 
            type: 'danger' 
          });
        }
      });
    }

    // Empty state add button listener
    const emptyAddBtn = container.querySelector('#btn-empty-add-product');
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', () => {
        editingProduct = null;
        currentGallery = [];
        isModalOpen = true;
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
    if (q('#form-p-desc')) q('#form-p-desc').value = prod.description || '';
    if (q('#form-p-materials')) q('#form-p-materials').value = prod.materials || '';
    if (q('#form-p-dimensions')) q('#form-p-dimensions').value = prod.dimensions || '';
    if (q('#form-p-weight')) q('#form-p-weight').value = prod.weight || '';
    if (q('#form-p-instock')) q('#form-p-instock').checked = prod.inStock !== false;

    currentGallery = Array.isArray(prod.gallery) && prod.gallery.length > 0 
      ? [...prod.gallery] 
      : (prod.image ? [prod.image] : []);
    renderGalleryPreview();
  }

  render();
}

// ==========================================
// AUREVIA - Script Principal
// ==========================================

// ==========================================
// 1. CADASTRO DE CLIENTES (Supabase)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const fullName = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const phone = document.getElementById('register-phone').value;
            const address = document.getElementById('register-address').value;
            const city = document.getElementById('register-city').value;
            const state = document.getElementById('register-state').value;
            const zipCode = document.getElementById('register-zip').value;
            const country = document.getElementById('register-country').value;
            const taxId = document.getElementById('register-taxid').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match. Please try again.');
                return;
            }

            try {
                const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password
                });

                if (authError) throw authError;

                const { error: dbError } = await supabaseClient
                    .from('customers')
                    .insert([{
                        full_name: fullName,
                        email: email,
                        phone: phone,
                        address: address,
                        city: city,
                        state: state,
                        zip_code: zipCode,
                        country: country,
                        tax_id: taxId
                    }]);

                if (dbError) throw dbError;

                alert('Account created successfully! Welcome to AUREVIA.');
                window.location.href = 'login.html';

            } catch (error) {
                console.error('Error:', error);
                alert('Error creating account: ' + error.message);
            }
        });
    }
});

// ==========================================
// 2. LOGIN DE CLIENTES (Supabase)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                alert('Welcome back to AUREVIA!');
                window.location.href = 'index.html';

            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed: ' + error.message);
            }
        });
    }
});

// ==========================================
// 3. CATÁLOGO DE PRODUTOS (com filtro pela URL + multi-moeda)
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    const productGrid = document.getElementById('product-grid');
    const categoryFilter = document.getElementById('filter-category');
    const sortFilter = document.getElementById('filter-sort');

    if (productGrid) {
        const urlParams = new URLSearchParams(window.location.search);
        const categoriaInicial = urlParams.get('category') || 'all';

        async function loadProducts(category = 'all', sortBy = 'featured') {
            try {
                let query = supabaseClient.from('products').select('*');

                if (category !== 'all') {
                    query = query.eq('category', category);
                }

                if (sortBy === 'price-low') {
                    query = query.order('sale_price', { ascending: true });
                } else if (sortBy === 'price-high') {
                    query = query.order('sale_price', { ascending: false });
                } else if (sortBy === 'newest') {
                    query = query.order('created_at', { ascending: false });
                } else {
                    query = query.order('created_at', { ascending: false });
                }

                const { data: products, error } = await query;
                if (error) throw error;

                productGrid.innerHTML = '';

                if (!products || products.length === 0) {
                    const lang = getCurrentLanguage();
                    const msg = lang === 'pt' ? 'Nenhum produto encontrado nesta categoria.' : 'No products found in this category.';
                    productGrid.innerHTML = `<p class="no-products">${msg}</p>`;
                    return;
                }

                const lang = getCurrentLanguage();
                const viewDetailsTxt = lang === 'pt' ? 'VER DETALHES' : 'VIEW DETAILS';

                products.forEach(product => {
                    const usdPrice = parseFloat(product.sale_price).toFixed(2);
                    const displayName = getProductName(product);
                    const card = document.createElement('div');
                    card.className = 'produto-card';
                    card.innerHTML = `
                        <div class="produto-imagem">
                            <img src="${product.image_url}" alt="${displayName}"
                                 onerror="this.src='img/placeholder.jpg'">
                        </div>
                        <h3>${displayName}</h3>
                        <p class="preco"
                           data-price-usd="${product.sale_price}"
                           data-price-brl="${product.price_brl || product.price}">
                            $ ${usdPrice}
                        </p>
                        <a href="produto.html?id=${product.id}" class="btn-produto" data-i18n="product.view_details">${viewDetailsTxt}</a>
                    `;
                    productGrid.appendChild(card);
                });

                if (typeof updateAllPrices === 'function') updateAllPrices();
                if (typeof applyTranslations === 'function') applyTranslations();

            } catch (error) {
                console.error('Error loading products:', error);
                productGrid.innerHTML = '<p class="no-products">Error loading products. Please try again later.</p>';
            }
        }

        loadProducts(categoriaInicial);

        if (categoryFilter && categoriaInicial !== 'all') {
            categoryFilter.value = categoriaInicial;
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', function() {
                loadProducts(this.value, sortFilter ? sortFilter.value : 'featured');
            });
        }

        if (sortFilter) {
            sortFilter.addEventListener('change', function() {
                loadProducts(categoryFilter ? categoryFilter.value : 'all', this.value);
            });
        }
    }
});

// ==========================================
// 4. PÁGINA DE PRODUTO INDIVIDUAL
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    const productDetail = document.getElementById('product-detail');
    const breadcrumbName = document.getElementById('breadcrumb-product-name');
    const relatedGrid = document.getElementById('related-products-grid');

    if (productDetail) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            productDetail.innerHTML = '<p class="error-message">Product not found.</p>';
            return;
        }

        try {
            const { data: product, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (error) throw error;

            if (!product) {
                productDetail.innerHTML = '<p class="error-message">Product not found.</p>';
                return;
            }

            window.currentProduct = product;

            const displayName = getProductName(product);

            if (breadcrumbName) breadcrumbName.textContent = displayName;
            document.title = `AUREVIA | ${displayName}`;

            const usdPrice = parseFloat(product.sale_price).toFixed(2);

            productDetail.innerHTML = `
                <div class="product-image">
                    <img src="${product.image_url}" alt="${displayName}">
                </div>
                <div class="product-info">
                    <h1>${displayName}</h1>
                    <p class="product-price"
                       data-price-usd="${product.sale_price}"
                       data-price-brl="${product.price_brl || product.price}">
                        $ ${usdPrice}
                    </p>
                    <div class="product-rating">
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="far fa-star"></i>
                        <span>(12 reviews)</span>
                    </div>
                    <p class="product-description">
                        ${product.description || 'A timeless piece from the AUREVIA collection.'}
                    </p>
                    <div class="product-details">
                        <h3 data-i18n="product.details">Details</h3>
                        <ul>
                            <li><strong>SKU:</strong> ${product.sku || 'N/A'}</li>
                            <li><strong data-i18n="product.material">Material</strong>: ${product.material || 'N/A'}</li>
                            <li><strong data-i18n="product.color">Color</strong>: ${product.color || 'N/A'}</li>
                            <li><strong data-i18n="product.size">Size</strong>: ${product.size || 'N/A'}</li>
                            <li><strong data-i18n="product.category">Category</strong>: ${product.category || 'N/A'}</li>
                        </ul>
                    </div>
                    <div class="product-options">
                        <div class="option-group">
                            <label for="quantity" data-i18n="product.quantity">Quantity:</label>
                            <input type="number" id="quantity" value="1" min="1" max="10">
                        </div>
                    </div>

                    <div class="product-actions">
                        <button class="btn-add-to-cart" onclick="handleAddToCart(${product.id})">
                            <i class="fas fa-shopping-bag"></i> <span data-i18n="product.add_to_cart">ADD TO CART</span>
                        </button>
                    </div>

                    <div id="paypal-button-container" style="margin-top: 20px;"></div>
                </div>
            `;

            if (typeof updateAllPrices === 'function') updateAllPrices();
            if (typeof applyTranslations === 'function') applyTranslations();

            initPayPalButton(product);

            if (relatedGrid) {
                const { data: related } = await supabaseClient
                    .from('products')
                    .select('*')
                    .eq('category', product.category)
                    .neq('id', product.id)
                    .limit(3);

                if (related && related.length > 0) {
                    relatedGrid.innerHTML = '';
                    related.forEach(item => {
                        const itemUsd = parseFloat(item.sale_price).toFixed(2);
                        const itemName = getProductName(item);
                        const card = document.createElement('div');
                        card.className = 'produto-card';
                        card.innerHTML = `
                            <div class="produto-imagem">
                                <img src="${item.image_url}" alt="${itemName}">
                            </div>
                            <h3>${itemName}</h3>
                            <p class="preco"
                               data-price-usd="${item.sale_price}"
                               data-price-brl="${item.price_brl || item.price}">
                                $ ${itemUsd}
                            </p>
                            <a href="produto.html?id=${item.id}" class="btn-produto" data-i18n="product.view_details">VIEW DETAILS</a>
                        `;
                        relatedGrid.appendChild(card);
                    });

                    if (typeof updateAllPrices === 'function') updateAllPrices();
                    if (typeof applyTranslations === 'function') applyTranslations();
                } else {
                    relatedGrid.innerHTML = '<p class="no-products">No related products found.</p>';
                }
            }

        } catch (error) {
            console.error('Error loading product:', error);
            productDetail.innerHTML = '<p class="error-message">Error loading product. Please try again later.</p>';
        }
    }
});

// ==========================================
// 5. BOTÃO DE PAGAMENTO PAYPAL (produto individual)
// ==========================================
async function initPayPalButton(product) {
    const container = document.getElementById('paypal-button-container');
    if (!container) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        const lang = getCurrentLanguage();
        const msg = lang === 'pt' ? 'Faça login ou crie uma conta para finalizar sua compra.' : 'Login or create an account to complete your purchase.';
        const btnTxt = lang === 'pt' ? 'ENTRAR PARA COMPRAR' : 'LOGIN TO PURCHASE';

        container.innerHTML = `
            <div style="text-align: center; padding: 20px; background-color: #faf9f7; border: 1px solid #eee;">
                <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">
                    <i class="fas fa-lock" style="color: #c5a059;"></i> 
                    ${msg}
                </p>
                <button class="btn-add-to-cart" onclick="window.location.href='login.html'" style="width: 100%;">
                    ${btnTxt}
                </button>
            </div>
        `;
        return;
    }

    if (typeof paypal === 'undefined') return;

    const priceInUSD = parseFloat(product.sale_price).toFixed(2);

    container.innerHTML = '';

    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    description: getProductName(product),
                    amount: {
                        value: priceInUSD,
                        currency_code: 'USD'
                    }
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(async function(details) {
                try {
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    const userEmail = session ? session.user.email : 'unknown';

                    const { data: customerData } = await supabaseClient
                        .from('customers')
                        .select('*')
                        .eq('email', userEmail)
                        .single();

                    const { data: orderData, error: orderError } = await supabaseClient
                        .from('orders')
                        .insert([{
                            customer_email: userEmail,
                            product_id: product.id,
                            product_name: getProductName(product),
                            quantity: 1,
                            total_amount: parseFloat(priceInUSD),
                            payment_method: 'PayPal',
                            payment_status: 'paid',
                            paypal_order_id: details.id,
                            shipping_name: customerData?.full_name || '',
                            shipping_address: customerData?.address || '',
                            shipping_city: customerData?.city || '',
                            shipping_state: customerData?.state || '',
                            shipping_zip: customerData?.zip_code || '',
                            shipping_country: customerData?.country || '',
                            shipping_phone: customerData?.phone || ''
                        }])
                        .select()
                        .single();

                    if (orderError) throw orderError;

                    const { error: itemError } = await supabaseClient
                        .from('order_items')
                        .insert([{
                            order_id: orderData.id,
                            product_id: product.id,
                            product_name: getProductName(product),
                            product_sku: product.sku || 'N/A',
                            quantity: 1,
                            price: parseFloat(priceInUSD)
                        }]);

                    if (itemError) console.error('Erro ao salvar item do pedido:', itemError);

                    window.location.href = `obrigado.html?order_id=${orderData.id}`;

                } catch (error) {
                    console.error('Erro ao salvar pedido:', error);
                    alert('There was an error saving your order. Please contact support.');
                }
            });
        },
        onError: function(err) {
            console.error('PayPal Error:', err);
            alert('There was an error processing your payment. Please try again.');
        },
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
        }
    }).render('#paypal-button-container');
}

// ==========================================
// FUNÇÃO DE LOGOUT (para testes)
// ==========================================
window.testarLogout = async function() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        alert('Erro ao fazer logout: ' + error.message);
    } else {
        alert('Logout realizado! Agora teste a página de produto novamente.');
        window.location.reload();
    }
};

// ==========================================
// 6. PÁGINA DE OBRIGADO (THANK YOU)
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    const orderSummary = document.getElementById('order-summary');

    if (orderSummary) {
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');

        if (!orderId) {
            orderSummary.innerHTML = '<p>Order details not available.</p>';
            return;
        }

        try {
            const { data: order, error: orderError } = await supabaseClient
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError;

            if (!order) {
                orderSummary.innerHTML = '<p>Order not found.</p>';
                return;
            }

            const { data: items } = await supabaseClient
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            const lang = getCurrentLanguage();
            const isPT = lang === 'pt';

            let itemsHtml = '';
            if (items && items.length > 0) {
                items.forEach(item => {
                    itemsHtml += `
                        <p><strong>${item.product_name}</strong> <span>x${item.quantity} — $ ${parseFloat(item.price * item.quantity).toFixed(2)}</span></p>
                    `;
                });
            } else {
                itemsHtml = `<p><strong>Product:</strong> <span>${order.product_name || 'N/A'}</span></p>
                             <p><strong>Quantity:</strong> <span>${order.quantity || 1}</span></p>`;
            }

            const dateLocale = isPT ? 'pt-BR' : 'en-US';

            orderSummary.innerHTML = `
                <h2 data-i18n="thanks.order_summary">${isPT ? 'Resumo do Pedido' : 'Order Summary'}</h2>
                <p><strong data-i18n="thanks.order_id">${isPT ? 'ID do Pedido' : 'Order ID'}:</strong> <span>#${order.id}</span></p>
                <p><strong data-i18n="thanks.date">${isPT ? 'Data' : 'Date'}:</strong> <span>${new Date(order.created_at).toLocaleDateString(dateLocale)}</span></p>
                <hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">
                <h3 style="font-family: 'Playfair Display', serif; font-size: 1.2rem; margin-bottom: 10px; font-weight: 400;" data-i18n="thanks.items">${isPT ? 'Itens' : 'Items'}</h3>
                ${itemsHtml}
                <p class="total"><strong data-i18n="thanks.total">${isPT ? 'Total' : 'Total'}:</strong> <span>$ ${parseFloat(order.total_amount).toFixed(2)}</span></p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                <h2 style="font-size: 1.2rem; margin-bottom: 15px;" data-i18n="thanks.shipping_info">${isPT ? 'Informações de Envio' : 'Shipping Information'}</h2>
                <p><strong data-i18n="thanks.name">${isPT ? 'Nome' : 'Name'}:</strong> <span>${order.shipping_name || 'N/A'}</span></p>
                <p><strong data-i18n="thanks.address">${isPT ? 'Endereço' : 'Address'}:</strong> <span>${order.shipping_address || 'N/A'}</span></p>
                <p><strong data-i18n="thanks.city">${isPT ? 'Cidade' : 'City'}:</strong> <span>${order.shipping_city || 'N/A'}</span></p>
                <p><strong data-i18n="thanks.state">${isPT ? 'Estado' : 'State'}:</strong> <span>${order.shipping_state || 'N/A'}</span></p>
                <p><strong data-i18n="thanks.zip">${isPT ? 'CEP' : 'ZIP'}:</strong> <span>${order.shipping_zip || 'N/A'}</span></p>
                <p><strong data-i18n="thanks.country">${isPT ? 'País' : 'Country'}:</strong> <span>${order.shipping_country || 'N/A'}</span></p>
            `;

        } catch (error) {
            console.error('Error loading order:', error);
            orderSummary.innerHTML = '<p>Error loading order details. Please contact support.</p>';
        }
    }
});

// ==========================================
// 7. CARRINHO DE COMPRAS (localStorage + multi-moeda)
// ==========================================

function getCart() {
    const cart = localStorage.getItem('aurevia_cart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('aurevia_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
        const cart = getCart();
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
    }
}

function addToCart(product, quantity = 1) {
    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            name_pt: product.name_pt || null,
            price_usd: parseFloat(product.sale_price),
            price_brl: parseFloat(product.price_brl || product.price),
            image_url: product.image_url,
            sku: product.sku,
            quantity: quantity
        });
    }

    saveCart(cart);
    return true;
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
}

function updateQuantity(productId, quantity) {
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = quantity;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart(cart);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    updateCartBadge();
});

// ==========================================
// 8. PÁGINA DO CARRINHO (carrinho.html)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSummaryContainer = document.getElementById('cart-summary');

    if (cartItemsContainer && cartSummaryContainer) {
        renderCart();
    }
});

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSummaryContainer = document.getElementById('cart-summary');
    const cart = getCart();
    const country = localStorage.getItem('aurevia_country') || 'US';
    const isBR = country === 'BR';
    const lang = getCurrentLanguage();
    const isPT = lang === 'pt';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-bag"></i>
                <h2 data-i18n="cart.empty_title">${isPT ? 'Sua sacola está vazia' : 'Your bag is empty'}</h2>
                <p data-i18n="cart.empty_text">${isPT ? 'Descubra nossas peças exclusivas e adicione-as à sua sacola.' : 'Discover our exclusive pieces and add them to your bag.'}</p>
                <a href="produtos.html" class="btn-hero" data-i18n="cart.empty_cta">${isPT ? 'EXPLORAR COLEÇÃO' : 'EXPLORE COLLECTION'}</a>
            </div>
        `;
        cartSummaryContainer.innerHTML = '';
        return;
    }

    cartItemsContainer.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const itemPrice = isBR ? item.price_brl : item.price_usd;
        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;
        const priceDisplay = isBR
            ? `R$ ${itemPrice.toFixed(2).replace('.', ',')}`
            : `$ ${itemPrice.toFixed(2)}`;
        
        const itemName = (isPT && item.name_pt) ? item.name_pt : item.name;

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image_url}" alt="${itemName}">
            </div>
            <div class="cart-item-info">
                <h3>${itemName}</h3>
                <p class="item-sku">SKU: ${item.sku || 'N/A'}</p>
                <p class="item-price">${priceDisplay}</p>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-control">
                    <button onclick="changeQuantity(${item.id}, -1)">−</button>
                    <input type="number" value="${item.quantity}" min="1" readonly>
                    <button onclick="changeQuantity(${item.id}, 1)">+</button>
                </div>
                <button class="cart-item-remove" onclick="removeItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(itemElement);
    });

    const subtotalDisplay = isBR
        ? `R$ ${subtotal.toFixed(2).replace('.', ',')}`
        : `$ ${subtotal.toFixed(2)}`;

    cartSummaryContainer.innerHTML = `
        <h2 data-i18n="cart.summary_title">${isPT ? 'Resumo do Pedido' : 'Order Summary'}</h2>
        <div class="cart-summary-row">
            <span data-i18n="cart.subtotal">Subtotal</span>
            <span>${subtotalDisplay}</span>
        </div>
        <div class="cart-summary-row">
            <span data-i18n="cart.shipping">${isPT ? 'Frete' : 'Shipping'}</span>
            <span data-i18n="cart.shipping_calculated">${isPT ? 'Calculado no checkout' : 'Calculated at checkout'}</span>
        </div>
        <div class="cart-summary-row total">
            <span data-i18n="cart.total">Total</span>
            <span>${subtotalDisplay}</span>
        </div>
        <button class="btn-checkout" onclick="proceedToCheckout()" data-i18n="cart.checkout">${isPT ? 'IR PARA O CHECKOUT' : 'PROCEED TO CHECKOUT'}</button>
        <a href="produtos.html" class="btn-continue-shopping" data-i18n="cart.continue">${isPT ? 'Continuar Comprando' : 'Continue Shopping'}</a>
    `;
}

window.changeQuantity = function(productId, delta) {
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            updateQuantity(productId, newQuantity);
        }
        renderCart();
    }
};

window.removeItem = function(productId) {
    const lang = getCurrentLanguage();
    const msg = lang === 'pt' ? 'Remover este item da sua sacola?' : 'Remove this item from your bag?';
    if (confirm(msg)) {
        removeFromCart(productId);
        renderCart();
    }
};

window.proceedToCheckout = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const lang = getCurrentLanguage();

    if (!session) {
        const msg = lang === 'pt' ? 'Faça login ou crie uma conta para finalizar sua compra.' : 'Please login or create an account to complete your purchase.';
        alert(msg);
        window.location.href = 'login.html';
        return;
    }

    window.location.href = 'checkout.html';
};

// ==========================================
// 9. HANDLE ADD TO CART (na página de produto)
// ==========================================
window.handleAddToCart = async function(productId) {
    const { data: product } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

    if (!product) return;

    const quantityInput = document.getElementById('quantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    addToCart(product, quantity);

    const lang = getCurrentLanguage();
    const displayName = getProductName(product);
    const msg = lang === 'pt' 
        ? `${quantity}x ${displayName} adicionado à sua sacola!`
        : `${quantity}x ${displayName} added to your bag!`;
    alert(msg);
};

// ==========================================
// 10. PÁGINA DE CHECKOUT (sempre em USD)
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    const checkoutItemsList = document.getElementById('checkout-items-list');
    const checkoutTotals = document.getElementById('checkout-totals');
    const shippingInfoDisplay = document.getElementById('shipping-info-display');

    if (checkoutItemsList && checkoutTotals) {
        const cart = getCart();

        if (cart.length === 0) {
            window.location.href = 'carrinho.html';
            return;
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        const { data: customerData } = await supabaseClient
            .from('customers')
            .select('*')
            .eq('email', session.user.email)
            .single();

        const lang = getCurrentLanguage();
        const isPT = lang === 'pt';

        checkoutItemsList.innerHTML = '';
        let subtotal = 0;

        cart.forEach(item => {
            const itemTotal = parseFloat(item.price_usd) * item.quantity;
            subtotal += itemTotal;
            const itemName = (isPT && item.name_pt) ? item.name_pt : item.name;

            const itemElement = document.createElement('div');
            itemElement.className = 'checkout-item';
            itemElement.innerHTML = `
                <div class="checkout-item-image">
                    <img src="${item.image_url}" alt="${itemName}">
                </div>
                <div class="checkout-item-info">
                    <h3>${itemName}</h3>
                    <p>Quantity: ${item.quantity}</p>
                    <p>SKU: ${item.sku || 'N/A'}</p>
                </div>
                <div class="checkout-item-price">$ ${itemTotal.toFixed(2)}</div>
            `;
            checkoutItemsList.appendChild(itemElement);
        });

        checkoutTotals.innerHTML = `
            <div class="checkout-summary-row">
                <span>Subtotal</span>
                <span>$ ${subtotal.toFixed(2)}</span>
            </div>
            <div class="checkout-summary-row">
                <span>Shipping</span>
                <span>Free</span>
            </div>
            <div class="checkout-summary-row total">
                <span>Total (USD)</span>
                <span>$ ${subtotal.toFixed(2)}</span>
            </div>
        `;

        if (shippingInfoDisplay && customerData) {
            shippingInfoDisplay.innerHTML = `
                <div class="shipping-info-box">
                    <h3>Shipping To</h3>
                    <p><strong>${customerData.full_name}</strong></p>
                    <p>${customerData.address}</p>
                    <p>${customerData.city}, ${customerData.state} ${customerData.zip_code}</p>
                    <p>${customerData.country}</p>
                    <p><i class="fas fa-phone"></i> ${customerData.phone}</p>
                </div>
            `;
        }

        initPayPalCheckout(cart, subtotal, customerData, session.user.email);
    }
});

// ==========================================
// 11. PAYPAL CHECKOUT (múltiplos itens)
// ==========================================
function initPayPalCheckout(cart, subtotal, customerData, userEmail) {
    const container = document.getElementById('paypal-checkout-container');
    if (!container || typeof paypal === 'undefined') return;

    container.innerHTML = '';
    const totalInUSD = parseFloat(subtotal).toFixed(2);

    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    description: `AUREVIA Order - ${cart.length} item(s)`,
                    amount: {
                        value: totalInUSD,
                        currency_code: 'USD'
                    }
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(async function(details) {
                try {
                    const { data: orderData, error: orderError } = await supabaseClient
                        .from('orders')
                        .insert([{
                            customer_email: userEmail,
                            total_amount: parseFloat(totalInUSD),
                            payment_method: 'PayPal',
                            payment_status: 'paid',
                            paypal_order_id: details.id,
                            shipping_name: customerData?.full_name || '',
                            shipping_address: customerData?.address || '',
                            shipping_city: customerData?.city || '',
                            shipping_state: customerData?.state || '',
                            shipping_zip: customerData?.zip_code || '',
                            shipping_country: customerData?.country || '',
                            shipping_phone: customerData?.phone || ''
                        }])
                        .select()
                        .single();

                    if (orderError) throw orderError;

                    const orderItems = cart.map(item => ({
                        order_id: orderData.id,
                        product_id: item.id,
                        product_name: item.name,
                        product_sku: item.sku,
                        quantity: item.quantity,
                        price: parseFloat(item.price_usd)
                    }));

                    const { error: itemsError } = await supabaseClient
                        .from('order_items')
                        .insert(orderItems);

                    if (itemsError) throw itemsError;

                    localStorage.removeItem('aurevia_cart');

                    window.location.href = `obrigado.html?order_id=${orderData.id}`;

                } catch (error) {
                    console.error('Erro ao salvar pedido:', error);
                    alert('There was an error saving your order. Please contact support.');
                }
            });
        },
        onError: function(err) {
            console.error('PayPal Error:', err);
            alert('There was an error processing your payment. Please try again.');
        },
        style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
        }
    }).render('#paypal-checkout-container');
}

// ==========================================
// 12. PRODUTOS ALEATÓRIOS NA HOME (3 por vez)
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    const homeGrid = document.getElementById('produtos-destaque');
    if (!homeGrid) return;
    if (document.getElementById('product-detail')) return;

    try {
        const { data: todosProdutos, error } = await supabaseClient
            .from('products')
            .select('*');

        if (error) throw error;
        if (!todosProdutos || todosProdutos.length === 0) return;

        const embaralhados = [...todosProdutos];
        for (let i = embaralhados.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
        }

        const selecionados = embaralhados.slice(0, 3);
        const lang = getCurrentLanguage();
        const viewDetailsTxt = lang === 'pt' ? 'VER DETALHES' : 'VIEW DETAILS';

        homeGrid.innerHTML = '';
        selecionados.forEach(product => {
            const usdPrice = parseFloat(product.sale_price).toFixed(2);
            const displayName = getProductName(product);
            const card = document.createElement('div');
            card.className = 'produto-card';
            card.innerHTML = `
                <div class="produto-imagem">
                    <img src="${product.image_url}" alt="${displayName}"
                         onerror="this.src='img/placeholder.jpg'>
                </div>
                <h3>${displayName}</h3>
                <p class="preco"
                   data-price-usd="${product.sale_price}"
                   data-price-brl="${product.price_brl || product.price}">
                    $ ${usdPrice}
                </p>
                <a href="produto.html?id=${product.id}" class="btn-produto" data-i18n="product.view_details">${viewDetailsTxt}</a>
            `;
            homeGrid.appendChild(card);
        });

        if (typeof updateAllPrices === 'function') updateAllPrices();
        if (typeof applyTranslations === 'function') applyTranslations();

    } catch (error) {
        console.error('Erro ao carregar produtos aleatórios:', error);
    }
});

// ==========================================
// 13. SELETOR DE PAÍS / MOEDA (com tradução)
// ==========================================

async function detectCountry() {
    const saved = localStorage.getItem('aurevia_country');
    if (saved) return saved;

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        const code = data.country_code || 'US';
        const country = code === 'BR' ? 'BR' : 'US';
        localStorage.setItem('aurevia_country', country);
        return country;
    } catch {
        localStorage.setItem('aurevia_country', 'US');
        return 'US';
    }
}

function updateCountryButton() {
    const country = localStorage.getItem('aurevia_country') || 'US';
    const flagIcon = document.getElementById('flag-icon');
    const countryCode = document.getElementById('country-code');
    const countryCurrency = document.getElementById('country-currency');

    if (!flagIcon) return;

    if (country === 'BR') {
        flagIcon.textContent = '🇧🇷';
        if (countryCode) countryCode.textContent = 'BR';
        if (countryCurrency) countryCurrency.textContent = 'BRL';
    } else {
        flagIcon.textContent = '🇺🇸';
        if (countryCode) countryCode.textContent = 'US';
        if (countryCurrency) countryCurrency.textContent = 'USD';
    }
}

function updateAllPrices() {
    const country = localStorage.getItem('aurevia_country') || 'US';

    document.querySelectorAll('[data-price-usd]').forEach(el => {
        const usd = el.dataset.priceUsd;
        const brl = el.dataset.priceBrl;

        if (country === 'BR') {
            el.textContent = `R$ ${parseFloat(brl).toFixed(2).replace('.', ',')}`;
        } else {
            el.textContent = `$ ${parseFloat(usd).toFixed(2)}`;
        }
    });

    updateCountryButton();
}

document.addEventListener('DOMContentLoaded', async () => {
    await detectCountry();
    updateAllPrices();

    if (typeof applyTranslations === 'function') applyTranslations();

    const countryBtn = document.getElementById('country-btn');
    const countryList = document.getElementById('country-list');

    countryBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        countryList?.classList.toggle('open');
    });

    document.querySelectorAll('#country-list li').forEach(item => {
        item.addEventListener('click', () => {
            const country = item.dataset.country;
            localStorage.setItem('aurevia_country', country);
            
            // ⭐ RECARREGA a página para aplicar tudo (tradução, preços, nomes)
            window.location.reload();
        });
    });

    document.addEventListener('click', () => {
        countryList?.classList.remove('open');
    });
});

window.updateAllPrices = updateAllPrices;
window.detectCountry = detectCountry;

// ==========================================
// 14. SISTEMA DE TRADUÇÃO (i18n) - PT/EN
// ==========================================

const TRANSLATIONS = {
    en: {
        'topbar.accessibility': 'ACCESSIBILITY',
        'topbar.shipping': 'Complimentary shipping on orders over $500*',
        'topbar.see_details': 'SEE DETAILS',
        'topbar.find_store': 'Find a Store',
        'header.account': 'ACCOUNT',
        'menu.home': 'Home',
        'menu.all_jewelry': 'All Jewelry',
        'menu.watches': 'Watches',
        'menu.charms': 'Charms',
        'menu.bracelets': 'Bracelets',
        'menu.about': 'About',
        'hero.yes': 'yes',
        'hero.forever': 'FOREVER',
        'hero.distributor': 'Official Worldwide Distributor of Rommanel',
        'hero.subtitle': 'Discover the jewelry that symbolizes your eternal moments.',
        'hero.cta': 'FIND YOUR PERFECT PIECE',
        'home.featured_title': 'Featured Collection',
        'home.about_title': 'The AUREVIA Essence',
        'home.about_text': "Born from a passion for creating jewelry that transcends time. Each AUREVIA piece is meticulously designed to celebrate life's most precious moments, blending artisanal tradition with contemporary design.",
        'home.about_cta': 'OUR STORY',
        'catalog.title': 'Jewelry Collection',
        'catalog.subtitle': 'Discover our exclusive pieces, crafted to last forever.',
        'catalog.category_label': 'CATEGORY',
        'catalog.category_all': 'All',
        'catalog.sort_label': 'SORT BY',
        'catalog.sort_featured': 'Featured',
        'catalog.sort_price_low': 'Price: Low to High',
        'catalog.sort_price_high': 'Price: High to Low',
        'catalog.sort_newest': 'Newest',
        'catalog.loading': 'Loading products...',
        'catalog.no_products': 'No products found in this category.',
        'catalog.error': 'Error loading products. Please try again later.',
        'product.view_details': 'VIEW DETAILS',
        'product.add_to_cart': 'ADD TO CART',
        'product.add_to_wishlist': 'ADD TO WISHLIST',
        'product.details': 'Details',
        'product.material': 'Material',
        'product.color': 'Color',
        'product.size': 'Size',
        'product.category': 'Category',
        'product.quantity': 'Quantity',
        'product.related_title': 'You May Also Like',
        'cart.title': 'Shopping Bag',
        'cart.empty_title': 'Your bag is empty',
        'cart.empty_text': 'Discover our exclusive pieces and add them to your bag.',
        'cart.empty_cta': 'EXPLORE COLLECTION',
        'cart.summary_title': 'Order Summary',
        'cart.subtotal': 'Subtotal',
        'cart.shipping': 'Shipping',
        'cart.shipping_calculated': 'Calculated at checkout',
        'cart.total': 'Total',
        'cart.checkout': 'PROCEED TO CHECKOUT',
        'cart.continue': 'Continue Shopping',
        'checkout.title': 'Checkout',
        'checkout.items_title': 'Your Order',
        'thanks.title': 'Thank You for Your Order!',
        'thanks.subtitle': 'Your purchase has been successfully completed.',
        'thanks.loading': 'Loading order details...',
        'thanks.continue': 'CONTINUE SHOPPING',
        'thanks.info_email': 'A confirmation email has been sent to your inbox.',
        'thanks.info_tracking': 'You will receive tracking information once your order ships.',
        'thanks.info_help': 'Need help? Contact us at',
        'thanks.order_summary': 'Order Summary',
        'thanks.order_id': 'Order ID',
        'thanks.date': 'Date',
        'thanks.items': 'Items',
        'thanks.total': 'Total',
        'thanks.shipping_info': 'Shipping Information',
        'thanks.name': 'Name',
        'thanks.address': 'Address',
        'thanks.city': 'City',
        'thanks.state': 'State',
        'thanks.zip': 'ZIP',
        'thanks.country': 'Country',
        'auth.login_title': 'Sign In',
        'auth.welcome': 'Welcome back to AUREVIA.',
        'auth.email': 'Email Address',
        'auth.password': 'Password',
        'auth.remember_me': 'Remember me',
        'auth.forgot_password': 'Forgot Password?',
        'auth.login_button': 'SIGN IN',
        'auth.no_account': "Don't have an account?",
        'auth.create_one': 'Create one now',
        'auth.or': 'OR',
        'auth.forgot_password_title': 'Forgot your password?',
        'auth.recovery_text': 'Enter your email to receive an access code.',
        'auth.send_code': 'SEND ACCESS CODE',
        'auth.register_title': 'Create Account',
        'auth.register_subtitle': 'Join AUREVIA and enjoy exclusive benefits.',
        'auth.personal_info': 'Personal Information',
        'auth.full_name': 'Full Name',
        'auth.phone': 'Phone Number',
        'auth.shipping_address_title': 'Shipping Address',
        'auth.address': 'Street Address',
        'auth.city': 'City',
        'auth.state_full': 'State / Province',
        'auth.zip': 'ZIP / Postal Code',
        'auth.country': 'Country',
        'auth.select_country': 'Select your country',
        'auth.country_us': 'United States',
        'auth.country_ca': 'Canada',
        'auth.country_uk': 'United Kingdom',
        'auth.country_eu': 'European Union',
        'auth.country_br': 'Brazil',
        'auth.country_other': 'Other',
        'auth.tax_info_title': 'Tax Information',
        'auth.tax_id_optional': 'Tax ID / SSN / CPF (Optional)',
        'auth.security_title': 'Security',
        'auth.confirm_password': 'Confirm Password',
        'auth.agree_terms': 'I agree to the',
        'auth.terms_of_service': 'Terms of Service',
        'auth.and': 'and',
        'auth.privacy_policy': 'Privacy Policy',
        'auth.register_button': 'CREATE ACCOUNT',
        'auth.has_account': 'Already have an account?',
        'auth.sign_in': 'Sign in',
        'about.title': 'Our Story',
        'about.subtitle': 'The essence of AUREVIA',
        'about.crafted_title': 'Crafted with Purpose',
        'about.p1': "AUREVIA was born from a passion for creating jewelry that transcends time. Each piece is meticulously designed to celebrate life's most precious moments, blending artisanal tradition with contemporary design.",
        'about.p2': 'Our name comes from the union of two ideas: Aurum (gold in Latin) and Via (path). It represents the journey of elegance — the golden path that each piece takes from our atelier to your hands.',
        'about.p3': "We believe that jewelry is more than an accessory. It's a symbol of love, a memory made tangible, a legacy to be passed down through generations. That's why every AUREVIA piece is crafted with the finest materials and the utmost care.",
        'about.p4': "Whether you're celebrating an engagement, an anniversary, or simply treating yourself, we're honored to be part of your story.",
        'about.values_title': 'Our Values',
        'about.value_exclusivity_title': 'Exclusivity',
        'about.value_exclusivity_text': 'Each piece is designed to be unique and timeless, never following fleeting trends.',
        'about.value_meaning_title': 'Meaning',
        'about.value_meaning_text': 'We create jewelry that carries emotional significance and tells your story.',
        'about.value_quality_title': 'Quality',
        'about.value_quality_text': 'Only the finest materials and craftsmanship go into every AUREVIA piece.',
        'about.value_timeless_title': 'Timelessness',
        'about.value_timeless_text': 'Designs that transcend generations, to be cherished forever.',
        'about.cta_title': 'Discover the Collection',
        'about.cta_text': 'Explore our exclusive pieces and find the one that speaks to you.',
        'about.cta': 'EXPLORE COLLECTION',
        'footer.distributor': 'Official Worldwide Distributor of Rommanel',
        'footer.rights': '© 2026 AUREVIA. All rights reserved.'
    },

    pt: {
        'topbar.accessibility': 'ACESSIBILIDADE',
        'topbar.shipping': 'Frete grátis em pedidos acima de $500*',
        'topbar.see_details': 'VER DETALHES',
        'topbar.find_store': 'Encontre uma Loja',
        'header.account': 'CONTA',
        'menu.home': 'Início',
        'menu.all_jewelry': 'Todas as Joias',
        'menu.watches': 'Relógios',
        'menu.charms': 'Pingentes',
        'menu.bracelets': 'Pulseiras',
        'menu.about': 'Sobre',
        'hero.yes': 'sim',
        'hero.forever': 'PARA SEMPRE',
        'hero.distributor': 'Distribuidor Oficial Mundial da Rommanel',
        'hero.subtitle': 'Descubra as joias que simbolizam seus momentos eternos.',
        'hero.cta': 'ENCONTRE SUA PEÇA PERFEITA',
        'home.featured_title': 'Coleção em Destaque',
        'home.about_title': 'A Essência AUREVIA',
        'home.about_text': 'Nascida da paixão por criar joias que transcendem o tempo. Cada peça AUREVIA é meticulosamente desenhada para celebrar os momentos mais preciosos da vida, unindo tradição artesanal e design contemporâneo.',
        'home.about_cta': 'NOSSA HISTÓRIA',
        'catalog.title': 'Coleção de Joias',
        'catalog.subtitle': 'Descubra nossas peças exclusivas, feitas para durar para sempre.',
        'catalog.category_label': 'CATEGORIA',
        'catalog.category_all': 'Todas',
        'catalog.sort_label': 'ORDENAR POR',
        'catalog.sort_featured': 'Destaques',
        'catalog.sort_price_low': 'Preço: Menor para Maior',
        'catalog.sort_price_high': 'Preço: Maior para Menor',
        'catalog.sort_newest': 'Mais Recentes',
        'catalog.loading': 'Carregando produtos...',
        'catalog.no_products': 'Nenhum produto encontrado nesta categoria.',
        'catalog.error': 'Erro ao carregar produtos. Tente novamente mais tarde.',
        'product.view_details': 'VER DETALHES',
        'product.add_to_cart': 'ADICIONAR AO CARRINHO',
        'product.add_to_wishlist': 'ADICIONAR AOS FAVORITOS',
        'product.details': 'Detalhes',
        'product.material': 'Material',
        'product.color': 'Cor',
        'product.size': 'Tamanho',
        'product.category': 'Categoria',
        'product.quantity': 'Quantidade',
        'product.related_title': 'Você Também Pode Gostar',
        'cart.title': 'Sua Sacola',
        'cart.empty_title': 'Sua sacola está vazia',
        'cart.empty_text': 'Descubra nossas peças exclusivas e adicione-as à sua sacola.',
        'cart.empty_cta': 'EXPLORAR COLEÇÃO',
        'cart.summary_title': 'Resumo do Pedido',
        'cart.subtotal': 'Subtotal',
        'cart.shipping': 'Frete',
        'cart.shipping_calculated': 'Calculado no checkout',
        'cart.total': 'Total',
        'cart.checkout': 'IR PARA O CHECKOUT',
        'cart.continue': 'Continuar Comprando',
        'checkout.title': 'Finalizar Compra',
        'checkout.items_title': 'Seu Pedido',
        'thanks.title': 'Obrigado pelo Seu Pedido!',
        'thanks.subtitle': 'Sua compra foi concluída com sucesso.',
        'thanks.loading': 'Carregando detalhes do pedido...',
        'thanks.continue': 'CONTINUAR COMPRANDO',
        'thanks.info_email': 'Um e-mail de confirmação foi enviado para sua caixa de entrada.',
        'thanks.info_tracking': 'Você receberá as informações de rastreamento assim que seu pedido for enviado.',
        'thanks.info_help': 'Precisa de ajuda? Fale conosco em',
        'thanks.order_summary': 'Resumo do Pedido',
        'thanks.order_id': 'ID do Pedido',
        'thanks.date': 'Data',
        'thanks.items': 'Itens',
        'thanks.total': 'Total',
        'thanks.shipping_info': 'Informações de Envio',
        'thanks.name': 'Nome',
        'thanks.address': 'Endereço',
        'thanks.city': 'Cidade',
        'thanks.state': 'Estado',
        'thanks.zip': 'CEP',
        'thanks.country': 'País',
        'auth.login_title': 'Entrar',
        'auth.welcome': 'Bem-vindo de volta à AUREVIA.',
        'auth.email': 'E-mail',
        'auth.password': 'Senha',
        'auth.remember_me': 'Lembrar-me',
        'auth.forgot_password': 'Esqueceu a Senha?',
        'auth.login_button': 'ENTRAR',
        'auth.no_account': 'Não tem uma conta?',
        'auth.create_one': 'Crie uma agora',
        'auth.or': 'OU',
        'auth.forgot_password_title': 'Esqueceu sua senha?',
        'auth.recovery_text': 'Digite seu e-mail para receber um código de acesso.',
        'auth.send_code': 'ENVIAR CÓDIGO DE ACESSO',
        'auth.register_title': 'Criar Conta',
        'auth.register_subtitle': 'Junte-se à AUREVIA e aproveite benefícios exclusivos.',
        'auth.personal_info': 'Informações Pessoais',
        'auth.full_name': 'Nome Completo',
        'auth.phone': 'Telefone',
        'auth.shipping_address_title': 'Endereço de Entrega',
        'auth.address': 'Endereço',
        'auth.city': 'Cidade',
        'auth.state_full': 'Estado / Província',
        'auth.zip': 'CEP / Código Postal',
        'auth.country': 'País',
        'auth.select_country': 'Selecione seu país',
        'auth.country_us': 'Estados Unidos',
        'auth.country_ca': 'Canadá',
        'auth.country_uk': 'Reino Unido',
        'auth.country_eu': 'União Europeia',
        'auth.country_br': 'Brasil',
        'auth.country_other': 'Outro',
        'auth.tax_info_title': 'Informações Fiscais',
        'auth.tax_id_optional': 'CPF / CNPJ / Tax ID (Opcional)',
        'auth.security_title': 'Segurança',
        'auth.confirm_password': 'Confirmar Senha',
        'auth.agree_terms': 'Eu concordo com os',
        'auth.terms_of_service': 'Termos de Serviço',
        'auth.and': 'e',
        'auth.privacy_policy': 'Política de Privacidade',
        'auth.register_button': 'CRIAR CONTA',
        'auth.has_account': 'Já tem uma conta?',
        'auth.sign_in': 'Entrar',
        'about.title': 'Nossa História',
        'about.subtitle': 'A essência da AUREVIA',
        'about.crafted_title': 'Feita com Propósito',
        'about.p1': 'A AUREVIA nasceu de uma paixão por criar joias que transcendem o tempo. Cada peça é meticulosamente desenhada para celebrar os momentos mais preciosos da vida, unindo tradição artesanal e design contemporâneo.',
        'about.p2': 'Nosso nome vem da união de duas ideias: Aurum (ouro em latim) e Via (caminho). Representa a jornada da elegância — o caminho dourado que cada peça percorre do nosso ateliê até suas mãos.',
        'about.p3': 'Acreditamos que joias são mais que um acessório. São símbolos de amor, memórias que se tornam tangíveis, um legado a ser transmitido entre gerações. É por isso que cada peça AUREVIA é feita com os melhores materiais e o máximo cuidado.',
        'about.p4': 'Se você está celebrando um noivado, um aniversário, ou simplesmente se presenteando, temos a honra de fazer parte da sua história.',
        'about.values_title': 'Nossos Valores',
        'about.value_exclusivity_title': 'Exclusividade',
        'about.value_exclusivity_text': 'Cada peça é desenhada para ser única e atemporal, sem seguir tendências passageiras.',
        'about.value_meaning_title': 'Significado',
        'about.value_meaning_text': 'Criamos joias que carregam significado emocional e contam a sua história.',
        'about.value_quality_title': 'Qualidade',
        'about.value_quality_text': 'Apenas os melhores materiais e o melhor artesanato entram em cada peça AUREVIA.',
        'about.value_timeless_title': 'Atemporalidade',
        'about.value_timeless_text': 'Designs que transcendem gerações, para serem apreciados para sempre.',
        'about.cta_title': 'Descubra a Coleção',
        'about.cta_text': 'Explore nossas peças exclusivas e encontre a que fala com você.',
        'about.cta': 'EXPLORAR COLEÇÃO',
        'footer.distributor': 'Distribuidor Oficial Mundial da Rommanel',
        'footer.rights': '© 2026 AUREVIA. Todos os direitos reservados.'
    }
};

function getCurrentLanguage() {
    const country = localStorage.getItem('aurevia_country') || 'US';
    return country === 'BR' ? 'pt' : 'en';
}

// ⭐ Retorna o nome do produto no idioma correto
function getProductName(product) {
    const lang = getCurrentLanguage();
    if (lang === 'pt' && product.name_pt) {
        return product.name_pt;
    }
    return product.name;
}

function applyTranslations() {
    const lang = getCurrentLanguage();
    const dict = TRANSLATIONS[lang];

    if (!dict) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (dict[key]) {
            el.placeholder = dict[key];
        }
    });

    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

    const titleEl = document.querySelector('title[data-i18n-title]');
    if (titleEl) {
        const key = titleEl.dataset.i18nTitle;
        if (dict[key]) titleEl.textContent = dict[key];
    }
}

document.addEventListener('DOMContentLoaded', applyTranslations);

window.applyTranslations = applyTranslations;
window.getCurrentLanguage = getCurrentLanguage;
window.getProductName = getProductName;
window.TRANSLATIONS = TRANSLATIONS;
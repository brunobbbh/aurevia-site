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
// 3. CATÁLOGO DE PRODUTOS (Supabase)
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    const productGrid = document.getElementById('product-grid');
    const categoryFilter = document.getElementById('filter-category');
    const sortFilter = document.getElementById('filter-sort');

    if (productGrid) {
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
                    productGrid.innerHTML = '<p class="no-products">No products found.</p>';
                    return;
                }

                products.forEach(product => {
                    const displayPrice = product.sale_price || product.price;
                    const card = document.createElement('div');
                    card.className = 'produto-card';
                    card.innerHTML = `
                        <div class="produto-imagem">
                            <img src="${product.image_url}" alt="${product.name}">
                        </div>
                        <h3>${product.name}</h3>
                        <p class="preco">$ ${parseFloat(displayPrice).toFixed(2)}</p>
                        <a href="produto.html?id=${product.id}" class="btn-produto">VIEW DETAILS</a>
                    `;
                    productGrid.appendChild(card);
                });

            } catch (error) {
                console.error('Error loading products:', error);
                productGrid.innerHTML = '<p class="no-products">Error loading products. Please try again later.</p>';
            }
        }

        loadProducts();

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
// 4. PÁGINA DE PRODUTO INDIVIDUAL (Supabase + PayPal)
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

            if (breadcrumbName) breadcrumbName.textContent = product.name;
            document.title = `AUREVIA | ${product.name}`;

            const displayPrice = product.sale_price || product.price;

            productDetail.innerHTML = `
                <div class="product-image">
                    <img src="${product.image_url}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h1>${product.name}</h1>
                    <p class="product-price">$ ${parseFloat(displayPrice).toFixed(2)}</p>
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
                        <h3>Details</h3>
                        <ul>
                            <li><strong>SKU:</strong> ${product.sku || 'N/A'}</li>
                            <li><strong>Material:</strong> ${product.material || 'N/A'}</li>
                            <li><strong>Color:</strong> ${product.color || 'N/A'}</li>
                            <li><strong>Size:</strong> ${product.size || 'N/A'}</li>
                            <li><strong>Category:</strong> ${product.category || 'N/A'}</li>
                        </ul>
                    </div>
                    <div class="product-options">
                        <div class="option-group">
                            <label for="quantity">Quantity:</label>
                            <input type="number" id="quantity" value="1" min="1" max="10">
                        </div>
                    </div>

                    <div class="product-actions">
                        <button class="btn-add-to-cart" onclick="handleAddToCart(${product.id})">
                            <i class="fas fa-shopping-bag"></i> ADD TO CART
                        </button>
                    </div>

                    <!-- Botão do PayPal (só aparece se estiver logado) -->
                    <div id="paypal-button-container" style="margin-top: 20px;"></div>
                </div>
            `;

            // Inicializar o botão do PayPal (verifica login internamente)
            initPayPalButton(product);

            // Carregar produtos relacionados
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
                        const price = item.sale_price || item.price;
                        const card = document.createElement('div');
                        card.className = 'produto-card';
                        card.innerHTML = `
                            <div class="produto-imagem">
                                <img src="${item.image_url}" alt="${item.name}">
                            </div>
                            <h3>${item.name}</h3>
                            <p class="preco">$ ${parseFloat(price).toFixed(2)}</p>
                            <a href="produto.html?id=${item.id}" class="btn-produto">VIEW DETAILS</a>
                        `;
                        relatedGrid.appendChild(card);
                    });
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
// 5. BOTÃO DE PAGAMENTO PAYPAL (com verificação de login + salvar pedido + redirecionar)
// ==========================================
async function initPayPalButton(product) {
    const container = document.getElementById('paypal-button-container');
    if (!container) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; background-color: #faf9f7; border: 1px solid #eee;">
                <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">
                    <i class="fas fa-lock" style="color: #c5a059;"></i> 
                    Login or create an account to complete your purchase.
                </p>
                <button class="btn-add-to-cart" onclick="window.location.href='login.html'" style="width: 100%;">
                    LOGIN TO PURCHASE
                </button>
            </div>
        `;
        return;
    }

    if (typeof paypal === 'undefined') return;

    const displayPrice = product.sale_price || product.price;
    const priceInUSD = parseFloat(displayPrice).toFixed(2);

    container.innerHTML = '';

    paypal.Buttons({
        createOrder: function(data, actions) {
            return actions.order.create({
                purchase_units: [{
                    description: product.name,
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
                            product_name: product.name,
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
// FUNÇÃO TEMPORÁRIA DE LOGOUT (PARA TESTES)
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

            orderSummary.innerHTML = `
                <h2>Order Summary</h2>
                <p><strong>Order ID:</strong> <span>#${order.id}</span></p>
                <p><strong>Date:</strong> <span>${new Date(order.created_at).toLocaleDateString('en-US')}</span></p>
                <hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">
                <h3 style="font-family: 'Playfair Display', serif; font-size: 1.2rem; margin-bottom: 10px; font-weight: 400;">Items</h3>
                ${itemsHtml}
                <p class="total"><strong>Total:</strong> <span>$ ${parseFloat(order.total_amount).toFixed(2)}</span></p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                <h2 style="font-size: 1.2rem; margin-bottom: 15px;">Shipping Information</h2>
                <p><strong>Name:</strong> <span>${order.shipping_name || 'N/A'}</span></p>
                <p><strong>Address:</strong> <span>${order.shipping_address || 'N/A'}</span></p>
                <p><strong>City:</strong> <span>${order.shipping_city || 'N/A'}</span></p>
                <p><strong>State:</strong> <span>${order.shipping_state || 'N/A'}</span></p>
                <p><strong>ZIP:</strong> <span>${order.shipping_zip || 'N/A'}</span></p>
                <p><strong>Country:</strong> <span>${order.shipping_country || 'N/A'}</span></p>
            `;

        } catch (error) {
            console.error('Error loading order:', error);
            orderSummary.innerHTML = '<p>Error loading order details. Please contact support.</p>';
        }
    }
});

// ==========================================
// 7. CARRINHO DE COMPRAS (localStorage)
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
            price: product.sale_price || product.price,
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

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-bag"></i>
                <h2>Your bag is empty</h2>
                <p>Discover our exclusive pieces and add them to your bag.</p>
                <a href="produtos.html" class="btn-hero">EXPLORE COLLECTION</a>
            </div>
        `;
        cartSummaryContainer.innerHTML = '';
        return;
    }

    cartItemsContainer.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = parseFloat(item.price) * item.quantity;
        subtotal += itemTotal;

        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image_url}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p class="item-sku">SKU: ${item.sku || 'N/A'}</p>
                <p class="item-price">$ ${parseFloat(item.price).toFixed(2)}</p>
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

    cartSummaryContainer.innerHTML = `
        <h2>Order Summary</h2>
        <div class="cart-summary-row">
            <span>Subtotal</span>
            <span>$ ${subtotal.toFixed(2)}</span>
        </div>
        <div class="cart-summary-row">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
        </div>
        <div class="cart-summary-row total">
            <span>Total</span>
            <span>$ ${subtotal.toFixed(2)}</span>
        </div>
        <button class="btn-checkout" onclick="proceedToCheckout()">PROCEED TO CHECKOUT</button>
        <a href="produtos.html" class="btn-continue-shopping">Continue Shopping</a>
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
    if (confirm('Remove this item from your bag?')) {
        removeFromCart(productId);
        renderCart();
    }
};

window.proceedToCheckout = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        alert('Please login or create an account to complete your purchase.');
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

    alert(`${quantity}x ${product.name} added to your bag!`);
};

// ==========================================
// 10. PÁGINA DE CHECKOUT (checkout.html)
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

        checkoutItemsList.innerHTML = '';
        let subtotal = 0;

        cart.forEach(item => {
            const itemTotal = parseFloat(item.price) * item.quantity;
            subtotal += itemTotal;

            const itemElement = document.createElement('div');
            itemElement.className = 'checkout-item';
            itemElement.innerHTML = `
                <div class="checkout-item-image">
                    <img src="${item.image_url}" alt="${item.name}">
                </div>
                <div class="checkout-item-info">
                    <h3>${item.name}</h3>
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
                <span>Total</span>
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
                        price: parseFloat(item.price)
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
    // Só roda se existir o grid da home
    const homeGrid = document.getElementById('produtos-destaque');
    
    // Se não estiver na home, sai
    if (!homeGrid) return;

    // Se estiver na página de produto, sai
    if (document.getElementById('product-detail')) return;

    try {
        const { data: todosProdutos, error } = await supabaseClient
            .from('products')
            .select('*');

        if (error) throw error;
        if (!todosProdutos || todosProdutos.length === 0) return;

        // Embaralhar (Fisher-Yates)
        const embaralhados = [...todosProdutos];
        for (let i = embaralhados.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
        }

        // Pegar 3 aleatórios
        const selecionados = embaralhados.slice(0, 3);

        // Renderizar
        homeGrid.innerHTML = '';
        selecionados.forEach(product => {
            const displayPrice = product.sale_price || product.price;
            const card = document.createElement('div');
            card.className = 'produto-card';
            card.innerHTML = `
                <div class="produto-imagem">
                    <img src="${product.image_url}" alt="${product.name}"
                         onerror="this.src='img/placeholder.jpg'">
                </div>
                <h3>${product.name}</h3>
                <p class="preco">$ ${parseFloat(displayPrice).toFixed(2)}</p>
                <a href="produto.html?id=${product.id}" class="btn-produto">VIEW DETAILS</a>
            `;
            homeGrid.appendChild(card);
        });

    } catch (error) {
        console.error('Erro ao carregar produtos aleatórios:', error);
    }
});
// ==========================================
// AUREVIA - Edge Function: Enviar E-mail de Pedido
// ==========================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("AUREVIA_URL") || Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("AUREVIA_SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_EMAIL = "bruno.hidalgoproject@gmail.com";

// Função para formatar data em inglês (independente do locale do servidor)
function formatDateUS(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

serve(async (req) => {
    try {
        // Pegar os dados do pedido enviados pelo Webhook
        const payload = await req.json();
        const order = payload.record;

        if (!order) {
            return new Response(JSON.stringify({ error: "No order data" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        console.log("=== NOVO PEDIDO RECEBIDO ===");
        console.log("Order ID:", order.id);
        console.log("Customer:", order.customer_email);

        // Criar cliente Supabase com service role (para poder ler qualquer tabela)
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Buscar os itens do pedido na tabela order_items
        const { data: items, error: itemsError } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

        console.log("Itens encontrados:", items);
        console.log("Total de itens:", items ? items.length : 0);

        if (itemsError) {
            console.error("Erro ao buscar itens:", itemsError);
        }

        // Montar a lista de itens do e-mail
        let itemsHtml = "";
        if (items && items.length > 0) {
            items.forEach((item) => {
                const itemTotal = (item.quantity * item.price).toFixed(2);
                itemsHtml += `
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.product_sku || 'N/A'}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$ ${parseFloat(item.price).toFixed(2)}</td>
                        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$ ${itemTotal}</td>
                    </tr>
                `;
            });
        } else {
            // Fallback: se não houver itens em order_items, usar os dados da tabela orders
            itemsHtml = `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${order.product_name || 'N/A'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">N/A</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${order.quantity || 1}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$ ${parseFloat(order.total_amount).toFixed(2)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$ ${parseFloat(order.total_amount).toFixed(2)}</td>
                </tr>
            `;
        }

        // Montar o corpo do e-mail
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
                <h1 style="color: #c5a059; text-align: center;">🛍️ New Order Received - AUREVIA</h1>
                <p style="text-align: center; color: #666;">Order #${order.id} - ${formatDateUS(order.created_at)}</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                
                <h2 style="color: #1c1c1c;">📦 Items Ordered</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #faf9f7;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #c5a059;">Product</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #c5a059;">SKU</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #c5a059;">Qty</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #c5a059;">Unit Price</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #c5a059;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="padding: 15px 8px; text-align: right; font-weight: bold; font-size: 1.1rem;">TOTAL:</td>
                            <td style="padding: 15px 8px; text-align: right; font-weight: bold; font-size: 1.1rem; color: #c5a059;">$ ${parseFloat(order.total_amount).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                
                <h2 style="color: #1c1c1c;">🚚 Shipping Information</h2>
                <p><strong>Customer:</strong> ${order.shipping_name || 'N/A'}</p>
                <p><strong>Email:</strong> ${order.customer_email}</p>
                <p><strong>Phone:</strong> ${order.shipping_phone || 'N/A'}</p>
                <p><strong>Address:</strong> ${order.shipping_address || 'N/A'}</p>
                <p><strong>City:</strong> ${order.shipping_city || 'N/A'}</p>
                <p><strong>State:</strong> ${order.shipping_state || 'N/A'}</p>
                <p><strong>ZIP:</strong> ${order.shipping_zip || 'N/A'}</p>
                <p><strong>Country:</strong> ${order.shipping_country || 'N/A'}</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                
                <h2 style="color: #1c1c1c;">💳 Payment</h2>
                <p><strong>Method:</strong> ${order.payment_method}</p>
                <p><strong>Status:</strong> ${order.payment_status}</p>
                <p><strong>PayPal Order ID:</strong> ${order.paypal_order_id || 'N/A'}</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                
                <p style="text-align: center; color: #999; font-size: 0.85rem;">
                    AUREVIA - Elegance That Lasts Forever
                </p>
            </div>
        `;

        // Enviar o e-mail via Resend
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "AUREVIA <onboarding@resend.dev>",
                to: [ADMIN_EMAIL],
                subject: `🛍️ New Order #${order.id} - ${items ? items.length : 0} item(s)`,
                html: emailHtml,
            }),
        });

        const data = await res.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Erro geral:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
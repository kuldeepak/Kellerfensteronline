import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { createAdminApiClient } from "@shopify/admin-api-client";
import { authenticate } from "../shopify.server";

const prisma = new PrismaClient();

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const loader = async () =>
    json({ status: "ok" }, { headers: corsHeaders });

function unwrap(response, key) {
    const data = response?.data?.[key];
    if (!data) {
        console.error("RAW SHOPIFY RESPONSE:", JSON.stringify(response, null, 2));
        throw new Error(
            response?.errors?.graphQLErrors?.[0]?.message ||
            "Shopify GraphQL error"
        );
    }
    return data;
}

export const action = async ({ request }) => {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        /* ---------- AUTH ---------- */
        const url = new URL(request.url);
        const shop = url.searchParams.get("shop");

        let session;
        try {
            session = (await authenticate.public.appProxy(request))?.session;
        } catch { }

        if (!session && shop) {
            session = await prisma.session.findFirst({
                where: { shop },
                orderBy: { id: "desc" },
            });
        }

        if (!session?.accessToken) {
            return json(
                { success: false, error: "Unauthorized" },
                { status: 403, headers: corsHeaders }
            );
        }

        const client = createAdminApiClient({
            storeDomain: session.shop,
            apiVersion: "2025-04",
            accessToken: session.accessToken,
        });

        const {
            productId,
            selections = {},
            measurements = {},
            quantity = 1,
            calculatedPrice = 0,
            baseProductTitle,
        } = await request.json();

        /* ---------- CONFIG ---------- */
        const productConfig = await prisma.product.findFirst({
            where: {
                OR: [{ id: productId }, { shopifyProductId: productId }],
            },
            include: { steps: { include: { options: true } } },
        });

        if (!productConfig) {
            return json(
                { success: false, error: "Product config not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        /* ---------- TITLE ---------- */
        const titleParts = [baseProductTitle || productConfig.name];
        for (const [k, v] of Object.entries(selections)) {
            const step = productConfig.steps.find(s => s.key === k);
            const opt = step?.options.find(o => o.value === v);
            if (opt) titleParts.push(opt.label);
        }
        if (measurements?.breite && measurements?.hoehe) {
            titleParts.push(`${measurements.breite}x${measurements.hoehe}mm`);
        }

        /* ---------- CREATE PRODUCT ---------- */
        const CREATE_PRODUCT = `
      mutation ($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            variants(first: 1) { nodes { id } }
          }
          userErrors { field message }
        }
      }
    `;

        const createData = unwrap(
            await client.request(CREATE_PRODUCT, {
                variables: {
                    input: {
                        title: titleParts.join(" - "),
                        status: "ACTIVE",
                        productType: "Customized",
                        tags: ["custom_generated"],
                        productOptions: [
                            { name: "Configuration", values: [{ name: "Custom" }] }
                        ],
                    },
                },
            }),
            "productCreate"
        );

        if (createData.userErrors.length) {
            return json({ success: false, errors: createData.userErrors });
        }

        const productGid = createData.product.id;
        const variantId = createData.product.variants.nodes[0].id;

        /* ---------- UPDATE PRICE (CORRECT 2025 WAY) ---------- */
        const UPDATE_VARIANTS = `
      mutation productVariantsBulkUpdate(
        $productId: ID!,
        $variants: [ProductVariantsBulkInput!]!
      ) {
        productVariantsBulkUpdate(
          productId: $productId,
          variants: $variants
        ) {
          productVariants { id price }
          userErrors { field message }
        }
      }
    `;

        const priceData = unwrap(
            await client.request(UPDATE_VARIANTS, {
                variables: {
                    productId: productGid,
                    variants: [
                        {
                            id: variantId,
                            price: String(calculatedPrice),
                            inventoryPolicy: "CONTINUE",
                            inventoryManagement: null,
                            taxable: true,
                        },
                    ],
                },
            }),
            "productVariantsBulkUpdate"
        );

        if (priceData.userErrors.length) {
            return json({ success: false, errors: priceData.userErrors });
        }

        /* ---------- PUBLISH ---------- */
        const SALES_CHANNELS = `
      query {
        salesChannels(first: 10) {
          nodes { id handle }
        }
      }
    `;

        const channels = await client.request(SALES_CHANNELS);
        const onlineStore = channels.salesChannels.nodes.find(
            c => c.handle === "online_store"
        );

        if (onlineStore) {
            const PUBLISH = `
        mutation ($id: ID!, $channelId: ID!) {
          publishablePublishToSalesChannel(
            id: $id
            salesChannelId: $channelId
          ) {
            userErrors { field message }
          }
        }
      `;
            await client.request(PUBLISH, {
                variables: { id: productGid, channelId: onlineStore.id },
            });
        }

        /* ---------- SAVE ---------- */
        const orderConfig = await prisma.orderConfiguration.create({
            data: {
                productId: productConfig.id,
                selections: JSON.stringify(selections),
                measurements: JSON.stringify(measurements),
                quantity,
                calculatedPrice,
            },
        });

        return json({
            success: true,
            shopifyProduct: { id: productGid, variantId },
            configurationId: orderConfig.id,
        });

    } catch (err) {
        console.error("APP PROXY ERROR:", err.message);
        return json(
            { success: false, error: err.message },
            { status: 500, headers: corsHeaders }
        );
    }
};

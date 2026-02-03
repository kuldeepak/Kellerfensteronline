import { json } from "@remix-run/node";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();
import prisma from "../db.server";

export const action = async ({ request }) => {
    try {
        const body = await request.json();
        const { productId, selections, measurements, quantity } = body;

        if (!productId) {
            return json(
                { success: false, error: "Product ID is required" },
                {
                    status: 400,
                    headers: { "Access-Control-Allow-Origin": "*" }
                }
            );
        }

        // Find product
        let product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                steps: {
                    include: {
                        options: true,
                    },
                },
                priceMatrices: true,
            },
        });

        // Try by Shopify Product ID if not found
        if (!product) {
            product = await prisma.product.findUnique({
                where: { shopifyProductId: productId },
                include: {
                    steps: {
                        include: {
                            options: true,
                        },
                    },
                    priceMatrices: true,
                },
            });
        }

        if (!product) {
            return json(
                { success: false, error: "Product not found" },
                {
                    status: 404,
                    headers: { "Access-Control-Allow-Origin": "*" }
                }
            );
        }

        let totalPrice = product.basePrice;

        // ============================================
        // Calculate Options Price
        // ============================================
        if (selections) {
            for (const [stepKey, selectedValue] of Object.entries(selections)) {
                const step = product.steps.find(s => s.key === stepKey);
                if (!step) continue;

                const option = step.options.find(o => o.value === selectedValue);
                if (option) {
                    totalPrice += option.price;
                }
            }
        }

        // ============================================
        // Calculate Measurement Price (from price matrix)
        // ============================================
        let measurementPrice = 0;
        if (measurements && measurements.breite && measurements.hoehe) {
            const width = parseInt(measurements.breite);
            const height = parseInt(measurements.hoehe);

            // Find matching price in matrix
            const priceEntry = product.priceMatrices.find(pm =>
                (width + 1) >= pm.widthMin &&
                (width + 1) <= pm.widthMax &&
                (height + 1) >= pm.heightMin &&
                (height + 1) <= pm.heightMax
            );

            if (priceEntry) {
                measurementPrice = priceEntry.price;
                totalPrice += measurementPrice;
            } else {
                // If no exact match, calculate based on area (fallback)
                const area = (width * height) / 1000000; // mm² to m²
                const pricePerSqM = 0; // Default price per square meter
                measurementPrice = area * pricePerSqM;
                totalPrice += measurementPrice;
            }
        }

        // ============================================
        // Apply Quantity
        // ============================================
        const qty = quantity || 1;
        const finalPrice = totalPrice * qty;

        // ============================================
        // Breakdown for transparency
        // ============================================
        const breakdown = {
            basePrice: product.basePrice,
            optionsPrice: totalPrice - product.basePrice - measurementPrice,
            measurementPrice: measurementPrice,
            subtotal: totalPrice,
            quantity: qty,
            total: finalPrice,
        };

        return json(
            {
                success: true,
                price: parseFloat(finalPrice.toFixed(2)),
                breakdown,
            },
            {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                }
            }
        );
    } catch (error) {
        console.error("Price Calculation Error:", error);
        return json(
            { success: false, error: error.message },
            {
                status: 500,
                headers: { "Access-Control-Allow-Origin": "*" }
            }
        );
    }
};

// Handle CORS preflight
export const loader = async () => {
    return json(
        {},
        {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            }
        }
    );
};
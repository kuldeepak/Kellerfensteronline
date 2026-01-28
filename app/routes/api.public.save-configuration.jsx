import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const action = async ({ request }) => {
    try {
        const body = await request.json();
        const { productId, orderId, selections, measurements, quantity, calculatedPrice } = body;

        if (!productId) {
            return json(
                { success: false, error: "Product ID is required" },
                {
                    status: 400,
                    headers: { "Access-Control-Allow-Origin": "*" }
                }
            );
        }

        // Save configuration
        const orderConfig = await prisma.orderConfiguration.create({
            data: {
                productId,
                orderId: orderId || null,
                selections: JSON.stringify(selections || {}),
                measurements: JSON.stringify(measurements || {}),
                quantity: quantity || 1,
                calculatedPrice: calculatedPrice || 0,
            },
        });

        return json(
            {
                success: true,
                configurationId: orderConfig.id,
            },
            {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                }
            }
        );
    } catch (error) {
        console.error("Save Configuration Error:", error);
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
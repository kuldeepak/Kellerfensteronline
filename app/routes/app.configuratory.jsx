import { useState, useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const shopifyProductId = formData.get("shopifyProductId");
  const name = formData.get("name");
  const basePrice = parseFloat(formData.get("basePrice") || 0);

  try {
    const product = await prisma.product.create({
      data: {
        shopifyProductId,
        name,
        basePrice,
      },
    });

    return json({ success: true, product });
  } catch (error) {
    console.error("Create Product Error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function NewProduct() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [formData, setFormData] = useState({
    shopifyProductId: "",
    name: "",
    basePrice: "0",
  });

  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.product) {
      shopify.toast.show("Product created successfully");
      // Redirect to configurator list
      navigate("/app/configurator");
    } else if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data, shopify, navigate]);

  const handleSubmit = () => {
    const submitData = new FormData();
    submitData.append("shopifyProductId", formData.shopifyProductId);
    submitData.append("name", formData.name);
    submitData.append("basePrice", formData.basePrice);

    fetcher.submit(submitData, { method: "POST" });
  };

  return (
    <s-page heading="Create New Product Configuration">
      <s-button
        slot="secondary-action"
        onClick={() => navigate("/app/configurator")}
      >
        Back to List
      </s-button>

      <s-section heading="Product Details">
        <s-stack direction="block" gap="base">
          <s-stack direction="block" gap="tight">
            <s-text variant="headingSm">Shopify Product ID</s-text>
            <input
              type="text"
              value={formData.shopifyProductId}
              onChange={(e) =>
                setFormData({ ...formData, shopifyProductId: e.target.value })
              }
              placeholder="gid://shopify/Product/123456789"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <s-text variant="bodySm" tone="subdued">
              The Shopify product GID (e.g., gid://shopify/Product/123456789)
            </s-text>
          </s-stack>

          <s-stack direction="block" gap="tight">
            <s-text variant="headingSm">Product Name</s-text>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Insektenschutz Fenster"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <s-text variant="bodySm" tone="subdued">
              Display name for this configuration
            </s-text>
          </s-stack>

          <s-stack direction="block" gap="tight">
            <s-text variant="headingSm">Base Price (€)</s-text>
            <input
              type="number"
              step="0.01"
              value={formData.basePrice}
              onChange={(e) =>
                setFormData({ ...formData, basePrice: e.target.value })
              }
              placeholder="0.00"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #c9cccf",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />
            <s-text variant="bodySm" tone="subdued">
              Base price from Shopify (usually 0 if dynamic pricing)
            </s-text>
          </s-stack>

          <s-stack direction="inline" gap="base">
            <s-button
              onClick={handleSubmit}
              {...(isLoading ? { loading: true } : {})}
              disabled={!formData.shopifyProductId || !formData.name}
            >
              Create Product
            </s-button>
            <s-button
              variant="tertiary"
              onClick={() => navigate("/app/configurator")}
            >
              Cancel
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Next Steps">
        <s-paragraph>After creating the product, you can:</s-paragraph>
        <s-unordered-list>
          <s-list-item>Add configuration steps</s-list-item>
          <s-list-item>Define step options with prices</s-list-item>
          <s-list-item>Set up measurement ranges</s-list-item>
          <s-list-item>Configure pricing matrix</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

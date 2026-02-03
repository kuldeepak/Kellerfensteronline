import { useState, useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();
import prisma from "../db.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const actionType = formData.get("action");

  try {
    // ============================================
    // DELETE PRODUCT
    // ============================================
    if (actionType === "deleteProduct") {
      const productId = formData.get("productId");

      // Cascade delete will handle steps, options, price matrices
      await prisma.product.delete({
        where: { id: productId },
      });

      return json({ success: true });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action Error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function Configurator() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/configurator?action=getProducts")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.products);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Product deleted successfully");
      window.location.reload();
    } else if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data, shopify]);

  const handleCreateProduct = () => {
    navigate("/app/configuratory");
  };

  const handleDeleteProduct = (productId) => {
    if (
      confirm(
        "Are you sure you want to delete this product? All steps, options, and pricing will be deleted!",
      )
    ) {
      const submitData = new FormData();
      submitData.append("action", "deleteProduct");
      submitData.append("productId", productId);
      fetcher.submit(submitData, { method: "POST" });
    }
  };

  return (
    <s-page heading="Product Configurator">
      <s-button slot="primary-action" onClick={handleCreateProduct}>
        Add New Product
      </s-button>

      <s-section heading="Configured Products">
        <s-paragraph>
          Manage product configurations, steps, options, and pricing matrices.
        </s-paragraph>

        {loading ? (
          <s-paragraph>Loading products...</s-paragraph>
        ) : products.length === 0 ? (
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-heading>No products configured yet</s-heading>
              <s-paragraph>
                Click "Add New Product" to create your first product
                configuration.
              </s-paragraph>
            </s-stack>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {products.map((product) => (
              <s-box
                key={product.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="tight">
                  <s-stack
                    direction="inline"
                    gap="base"
                    style={{
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <s-heading>{product.name}</s-heading>
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      Delete Product
                    </s-button>
                  </s-stack>

                  <s-paragraph>
                    <s-text>
                      <strong>Shopify ID:</strong> {product.shopifyProductId}
                    </s-text>
                  </s-paragraph>
                  <s-paragraph>
                    <s-text>
                      <strong>Steps:</strong> {product.steps?.length || 0}
                    </s-text>
                  </s-paragraph>
                  <s-paragraph>
                    <s-text>
                      <strong>Base Price:</strong>{" "}
                      {product.basePrice.toFixed(2)} €
                    </s-text>
                  </s-paragraph>
                  <s-stack direction="inline" gap="base">
                    <s-button
                      onClick={() =>
                        navigate(`/app/configuratoryy/${product.id}`)
                      }
                    >
                      Configure Steps
                    </s-button>
                    <s-button
                      variant="secondary"
                      onClick={() =>
                        navigate(`/app/configuratoryyy/pricing/${product.id}`)
                      }
                    >
                      Manage Pricing
                    </s-button>
                    <s-button
                      variant="tertiary"
                      onClick={() =>
                        navigate(`/app/configuratore/edit/${product.id}`)
                      }
                    >
                      Edit Product
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Quick Guide">
        <s-unordered-list>
          <s-list-item>Create a product configuration</s-list-item>
          <s-list-item>Add steps (options or measurements)</s-list-item>
          <s-list-item>Configure step options with prices</s-list-item>
          <s-list-item>Set up pricing matrix for measurements</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

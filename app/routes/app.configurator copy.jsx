import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Configurator() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch products on mount
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

  const handleCreateProduct = () => {
    navigate("/app/configuratory");
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
                  <s-heading>{product.name}</s-heading>
                  <s-paragraph>
                    <s-text>Shopify ID: {product.shopifyProductId}</s-text>
                  </s-paragraph>
                  <s-paragraph>
                    <s-text>Steps: {product.steps?.length || 0}</s-text>
                  </s-paragraph>
                  <s-paragraph>
                    <s-text>
                      Base Price: {product.basePrice.toFixed(2)} €
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
                      variant="tertiary"
                      onClick={() =>
                        navigate(`/app/configuratoryyy/pricing/${product.id}`)
                      }
                    >
                      Manage Pricing
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

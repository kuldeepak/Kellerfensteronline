import { useState, useEffect } from "react";
import {
  useFetcher,
  useNavigate,
  useParams,
  useLoaderData,
  useRevalidator,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();
import prisma from "../db.server";

export const loader = async ({ request, params }) => {
  await authenticate.admin(request);

  const productId = params.productId;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      priceMatrices: {
        orderBy: [{ widthMin: "asc" }, { heightMin: "asc" }],
      },
    },
  });

  return json({ product });
};

export const action = async ({ request, params }) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const actionType = formData.get("action");
  const productId = params.productId;

  try {
    // ============================================
    // CREATE PRICE MATRIX ENTRY
    // ============================================
    if (actionType === "createPriceMatrix") {
      const widthMin = parseInt(formData.get("widthMin"));
      const widthMax = parseInt(formData.get("widthMax"));
      const heightMin = parseInt(formData.get("heightMin"));
      const heightMax = parseInt(formData.get("heightMax"));
      const price = parseFloat(formData.get("price"));

      const priceMatrix = await prisma.priceMatrix.create({
        data: {
          productId,
          widthMin,
          widthMax,
          heightMin,
          heightMax,
          price,
        },
      });

      return json({ success: true, priceMatrix });
    }

    // ============================================
    // BULK CREATE PRICE MATRIX (Excel import)
    // ============================================
    if (actionType === "bulkCreatePriceMatrix") {
      const bulkData = JSON.parse(formData.get("bulkData"));

      // Delete existing entries for this product
      await prisma.priceMatrix.deleteMany({
        where: { productId },
      });

      // Create new entries
      const created = await prisma.priceMatrix.createMany({
        data: bulkData.map((item) => ({
          productId,
          widthMin: item.widthMin,
          widthMax: item.widthMax,
          heightMin: item.heightMin,
          heightMax: item.heightMax,
          price: item.price,
        })),
      });

      return json({ success: true, count: created.count });
    }

    // ============================================
    // DELETE PRICE MATRIX ENTRY
    // ============================================
    if (actionType === "deletePriceMatrix") {
      const priceMatrixId = formData.get("priceMatrixId");

      await prisma.priceMatrix.delete({
        where: { id: priceMatrixId },
      });

      return json({ success: true });
    }

    // ============================================
    // DELETE ALL PRICE MATRICES
    // ============================================
    if (actionType === "deleteAllPriceMatrices") {
      await prisma.priceMatrix.deleteMany({
        where: { productId },
      });

      return json({ success: true });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action Error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function PricingMatrix() {
  const { product } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [formData, setFormData] = useState({
    widthMin: "",
    widthMax: "",
    heightMin: "",
    heightMax: "",
    price: "",
  });
  const [bulkImportText, setBulkImportText] = useState("");

  const isLoading = ["loading", "submitting"].includes(fetcher.state);
  const revalidator = useRevalidator();

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Success!");
      setShowForm(false);
      setShowBulkImport(false);
      setFormData({
        widthMin: "",
        widthMax: "",
        heightMin: "",
        heightMax: "",
        price: "",
      });
      setBulkImportText("");
      //   window.location.reload();
      revalidator.revalidate();
    } else if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data, shopify]);

  const handleCreateEntry = () => {
    const submitData = new FormData();
    submitData.append("action", "createPriceMatrix");
    submitData.append("widthMin", formData.widthMin);
    submitData.append("widthMax", formData.widthMax);
    submitData.append("heightMin", formData.heightMin);
    submitData.append("heightMax", formData.heightMax);
    submitData.append("price", formData.price);

    fetcher.submit(submitData, { method: "POST" });
  };

  const handleBulkImport = () => {
    try {
      // Parse CSV-like format
      const lines = bulkImportText.trim().split("\n");
      const bulkData = [];

      for (const line of lines) {
        const [widthMin, widthMax, heightMin, heightMax, price] = line
          .split(",")
          .map((s) => s.trim());

        if (widthMin && widthMax && heightMin && heightMax && price) {
          bulkData.push({
            widthMin: parseInt(widthMin),
            widthMax: parseInt(widthMax),
            heightMin: parseInt(heightMin),
            heightMax: parseInt(heightMax),
            price: parseFloat(price),
          });
        }
      }

      if (bulkData.length === 0) {
        shopify.toast.show("No valid data found");
        return;
      }

      const submitData = new FormData();
      submitData.append("action", "bulkCreatePriceMatrix");
      submitData.append("bulkData", JSON.stringify(bulkData));

      fetcher.submit(submitData, { method: "POST" });
    } catch (error) {
      shopify.toast.show(`Parse Error: ${error.message}`);
    }
  };

  const handleDeleteEntry = (priceMatrixId) => {
    if (confirm("Delete this pricing entry?")) {
      const submitData = new FormData();
      submitData.append("action", "deletePriceMatrix");
      submitData.append("priceMatrixId", priceMatrixId);
      fetcher.submit(submitData, { method: "POST" });
    }
  };

  const handleDeleteAll = () => {
    if (
      confirm(
        "Are you sure you want to delete ALL pricing entries? This cannot be undone!",
      )
    ) {
      const submitData = new FormData();
      submitData.append("action", "deleteAllPriceMatrices");
      fetcher.submit(submitData, { method: "POST" });
    }
  };

  if (!product) {
    return (
      <s-page heading="Product Not Found">
        <s-section>
          <s-paragraph>Product not found.</s-paragraph>
          <s-button onClick={() => navigate("/app/configurator")}>
            Back to List
          </s-button>
        </s-section>
      </s-page>
    );
  }

  // Group by width range for better display
  const groupedPrices = {};
  product.priceMatrices.forEach((pm) => {
    const key = `${pm.widthMin}-${pm.widthMax}`;
    if (!groupedPrices[key]) {
      groupedPrices[key] = [];
    }
    groupedPrices[key].push(pm);
  });

  return (
    <s-page heading={`Pricing Matrix: ${product.name}`}>
      <s-button
        slot="secondary-action"
        onClick={() => navigate(`/app/configuratoryy/${product.id}`)}
      >
        Back to Steps
      </s-button>

      <s-section heading="Product Information">
        <s-stack direction="block" gap="tight">
          <s-text>
            <strong>Product:</strong> {product.name}
          </s-text>
          <s-text>
            <strong>Total Pricing Entries:</strong>{" "}
            {product.priceMatrices.length}
          </s-text>
        </s-stack>
      </s-section>

      <s-section heading="Pricing Matrix Entries">
        <s-stack direction="block" gap="base">
          {product.priceMatrices.length === 0 ? (
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-paragraph>
                No pricing entries yet. Add entries below or use bulk import.
              </s-paragraph>
            </s-box>
          ) : (
            <>
              <s-stack direction="inline" gap="base">
                <s-button
                  variant="tertiary"
                  tone="critical"
                  onClick={handleDeleteAll}
                >
                  Delete All Entries
                </s-button>
              </s-stack>

              {Object.keys(groupedPrices).map((widthRange) => (
                <s-box
                  key={widthRange}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >
                  <s-stack direction="block" gap="tight">
                    <s-heading variant="headingSm">
                      Width: {widthRange} mm
                    </s-heading>

                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "14px",
                        }}
                      >
                        <thead>
                          <tr style={{ borderBottom: "2px solid #ddd" }}>
                            <th style={{ padding: "8px", textAlign: "left" }}>
                              Height Range (mm)
                            </th>
                            <th style={{ padding: "8px", textAlign: "right" }}>
                              Price (€)
                            </th>
                            <th style={{ padding: "8px", textAlign: "center" }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedPrices[widthRange].map((pm) => (
                            <tr
                              key={pm.id}
                              style={{ borderBottom: "1px solid #eee" }}
                            >
                              <td style={{ padding: "8px" }}>
                                {pm.heightMin} - {pm.heightMax}
                              </td>
                              <td
                                style={{ padding: "8px", textAlign: "right" }}
                              >
                                {pm.price.toFixed(2)}
                              </td>
                              <td
                                style={{ padding: "8px", textAlign: "center" }}
                              >
                                <button
                                  onClick={() => handleDeleteEntry(pm.id)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#bf0711",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    textDecoration: "underline",
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </s-stack>
                </s-box>
              ))}
            </>
          )}

          <s-stack direction="inline" gap="base">
            <s-button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "Add Single Entry"}
            </s-button>
            <s-button
              variant="secondary"
              onClick={() => setShowBulkImport(!showBulkImport)}
            >
              {showBulkImport ? "Cancel Bulk Import" : "Bulk Import (CSV)"}
            </s-button>
          </s-stack>

          {/* Single Entry Form */}
          {showForm && (
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>Add Pricing Entry</s-heading>

                <s-stack direction="inline" gap="base">
                  <div style={{ width: "48%" }}>
                    <s-text variant="bodySm">Width Min (mm)</s-text>
                    <input
                      type="number"
                      value={formData.widthMin}
                      onChange={(e) =>
                        setFormData({ ...formData, widthMin: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #c9cccf",
                        borderRadius: "4px",
                        marginTop: "4px",
                      }}
                    />
                  </div>
                  <div style={{ width: "48%" }}>
                    <s-text variant="bodySm">Width Max (mm)</s-text>
                    <input
                      type="number"
                      value={formData.widthMax}
                      onChange={(e) =>
                        setFormData({ ...formData, widthMax: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #c9cccf",
                        borderRadius: "4px",
                        marginTop: "4px",
                      }}
                    />
                  </div>
                </s-stack>

                <s-stack direction="inline" gap="base">
                  <div style={{ width: "48%" }}>
                    <s-text variant="bodySm">Height Min (mm)</s-text>
                    <input
                      type="number"
                      value={formData.heightMin}
                      onChange={(e) =>
                        setFormData({ ...formData, heightMin: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #c9cccf",
                        borderRadius: "4px",
                        marginTop: "4px",
                      }}
                    />
                  </div>
                  <div style={{ width: "48%" }}>
                    <s-text variant="bodySm">Height Max (mm)</s-text>
                    <input
                      type="number"
                      value={formData.heightMax}
                      onChange={(e) =>
                        setFormData({ ...formData, heightMax: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #c9cccf",
                        borderRadius: "4px",
                        marginTop: "4px",
                      }}
                    />
                  </div>
                </s-stack>

                <div>
                  <s-text variant="bodySm">Price (€)</s-text>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #c9cccf",
                      borderRadius: "4px",
                      marginTop: "4px",
                    }}
                  />
                </div>

                <s-stack direction="inline" gap="base">
                  <s-button
                    onClick={handleCreateEntry}
                    {...(isLoading ? { loading: true } : {})}
                  >
                    Add Entry
                  </s-button>
                  <s-button
                    variant="tertiary"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </s-button>
                </s-stack>
              </s-stack>
            </s-box>
          )}

          {/* Bulk Import Form */}
          {showBulkImport && (
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>Bulk Import (CSV Format)</s-heading>
                <s-paragraph>
                  Paste CSV data in format: widthMin, widthMax, heightMin,
                  heightMax, price
                  <br />
                  Example: 500, 600, 400, 500, 31.57
                </s-paragraph>

                <textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  placeholder="500, 600, 400, 500, 31.57&#10;500, 600, 500, 600, 37.83&#10;500, 600, 600, 700, 44.34"
                  rows="10"
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #c9cccf",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                />

                <s-stack direction="inline" gap="base">
                  <s-button
                    onClick={handleBulkImport}
                    {...(isLoading ? { loading: true } : {})}
                  >
                    Import Data
                  </s-button>
                  <s-button
                    variant="tertiary"
                    onClick={() => setShowBulkImport(false)}
                  >
                    Cancel
                  </s-button>
                </s-stack>
              </s-stack>
            </s-box>
          )}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Instructions">
        <s-unordered-list>
          <s-list-item>Add individual pricing entries manually</s-list-item>
          <s-list-item>Or use bulk import for Excel data</s-list-item>
          <s-list-item>
            Format: widthMin, widthMax, heightMin, heightMax, price
          </s-list-item>
          <s-list-item>Bulk import replaces all existing data</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

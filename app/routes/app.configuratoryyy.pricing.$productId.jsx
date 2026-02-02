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
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    // SAVE PIVOT TABLE
    // ============================================
    if (actionType === "savePivotTable") {
      const pivotData = JSON.parse(formData.get("pivotData"));

      // Delete existing entries for this product
      await prisma.priceMatrix.deleteMany({
        where: { productId },
      });

      // Create new entries
      const created = await prisma.priceMatrix.createMany({
        data: pivotData.map((item) => ({
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
  const revalidator = useRevalidator();

  // Default ranges
  const defaultWidthRanges = [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300];
  const defaultHeightRanges = [500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800];

  // State for editable pivot table
  const [widthRanges, setWidthRanges] = useState(defaultWidthRanges);
  const [heightRanges, setHeightRanges] = useState(defaultHeightRanges);
  const [pivotTable, setPivotTable] = useState({});
  const [editingCell, setEditingCell] = useState(null);

  const isLoading = ["loading", "submitting"].includes(fetcher.state);

  // Initialize pivot table from existing data
  useEffect(() => {
    if (product?.priceMatrices?.length > 0) {
      const newPivotTable = {};
      const widthSet = new Set();
      const heightSet = new Set();

      product.priceMatrices.forEach((pm) => {
        widthSet.add(pm.widthMin);
        heightSet.add(pm.heightMin);
        const key = `${pm.widthMin}-${pm.heightMin}`;
        newPivotTable[key] = pm.price;
      });

      if (widthSet.size > 0) setWidthRanges([...widthSet].sort((a, b) => a - b));
      if (heightSet.size > 0) setHeightRanges([...heightSet].sort((a, b) => a - b));
      setPivotTable(newPivotTable);
    }
  }, [product]);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Pricing matrix saved successfully!");
      revalidator.revalidate();
    } else if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data, shopify]);

  const handleSavePivotTable = () => {
    const pivotData = [];

    heightRanges.forEach((heightMin, hIdx) => {
      const heightMax = hIdx < heightRanges.length - 1 ? heightRanges[hIdx + 1] : heightMin + 100;

      widthRanges.forEach((widthMin, wIdx) => {
        const widthMax = wIdx < widthRanges.length - 1 ? widthRanges[wIdx + 1] : widthMin + 100;
        const key = `${widthMin}-${heightMin}`;
        const price = pivotTable[key];

        if (price && !isNaN(parseFloat(price))) {
          pivotData.push({
            widthMin,
            widthMax,
            heightMin,
            heightMax,
            price: parseFloat(price),
          });
        }
      });
    });

    if (pivotData.length === 0) {
      shopify.toast.show("No valid pricing data to save");
      return;
    }

    const submitData = new FormData();
    submitData.append("action", "savePivotTable");
    submitData.append("pivotData", JSON.stringify(pivotData));

    fetcher.submit(submitData, { method: "POST" });
  };

  const handleCellChange = (widthMin, heightMin, value) => {
    const key = `${widthMin}-${heightMin}`;
    setPivotTable({
      ...pivotTable,
      [key]: value,
    });
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
      setPivotTable({});
    }
  };

  const addWidthRange = () => {
    const newWidth = widthRanges.length > 0 ? widthRanges[widthRanges.length - 1] + 100 : 400;
    setWidthRanges([...widthRanges, newWidth]);
  };

  const addHeightRange = () => {
    const newHeight = heightRanges.length > 0 ? heightRanges[heightRanges.length - 1] + 100 : 500;
    setHeightRanges([...heightRanges, newHeight]);
  };

  const removeWidthRange = (width) => {
    if (widthRanges.length <= 1) {
      shopify.toast.show("Must have at least one width range");
      return;
    }
    setWidthRanges(widthRanges.filter(w => w !== width));
    // Clean up pivot table
    const newPivotTable = { ...pivotTable };
    heightRanges.forEach(h => {
      delete newPivotTable[`${width}-${h}`];
    });
    setPivotTable(newPivotTable);
  };

  const removeHeightRange = (height) => {
    if (heightRanges.length <= 1) {
      shopify.toast.show("Must have at least one height range");
      return;
    }
    setHeightRanges(heightRanges.filter(h => h !== height));
    // Clean up pivot table
    const newPivotTable = { ...pivotTable };
    widthRanges.forEach(w => {
      delete newPivotTable[`${w}-${height}`];
    });
    setPivotTable(newPivotTable);
  };

  const updateWidthRange = (oldWidth, newWidth) => {
    const newValue = parseInt(newWidth);
    if (isNaN(newValue) || newValue <= 0) return;

    const newWidthRanges = widthRanges.map(w => w === oldWidth ? newValue : w);
    setWidthRanges(newWidthRanges.sort((a, b) => a - b));

    // Update pivot table keys
    const newPivotTable = {};
    Object.keys(pivotTable).forEach(key => {
      const [w, h] = key.split('-').map(Number);
      const newKey = `${w === oldWidth ? newValue : w}-${h}`;
      newPivotTable[newKey] = pivotTable[key];
    });
    setPivotTable(newPivotTable);
  };

  const updateHeightRange = (oldHeight, newHeight) => {
    const newValue = parseInt(newHeight);
    if (isNaN(newValue) || newValue <= 0) return;

    const newHeightRanges = heightRanges.map(h => h === oldHeight ? newValue : h);
    setHeightRanges(newHeightRanges.sort((a, b) => a - b));

    // Update pivot table keys
    const newPivotTable = {};
    Object.keys(pivotTable).forEach(key => {
      const [w, h] = key.split('-').map(Number);
      const newKey = `${w}-${h === oldHeight ? newValue : h}`;
      newPivotTable[newKey] = pivotTable[key];
    });
    setPivotTable(newPivotTable);
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
            {Object.keys(pivotTable).filter(k => pivotTable[k]).length}
          </s-text>
        </s-stack>
      </s-section>

      <s-section heading="Editable Pricing Matrix">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-button
              onClick={handleSavePivotTable}
              {...(isLoading ? { loading: true } : {})}
            >
              Save All Changes
            </s-button>
            <s-button
              variant="tertiary"
              tone="critical"
              onClick={handleDeleteAll}
            >
              Delete All Entries
            </s-button>
          </s-stack>

          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "600px" }}>
            <table
              style={{
                borderCollapse: "collapse",
                fontSize: "13px",
                minWidth: "100%",
              }}
            >
              <thead style={{ position: "sticky", top: 0, background: "#f6f6f7", zIndex: 10 }}>
                <tr>
                  <th
                    style={{
                      padding: "12px 8px",
                      border: "2px solid #c9cccf",
                      background: "#e3e4e6",
                      position: "sticky",
                      left: 0,
                      zIndex: 11,
                      minWidth: "120px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Height (mm) →<br />Width (mm) ↓</span>
                    </div>
                  </th>
                  {heightRanges.map((height, idx) => (
                    <th
                      key={height}
                      style={{
                        padding: "8px",
                        border: "2px solid #c9cccf",
                        background: "#5c6ac4",
                        color: "white",
                        minWidth: "100px",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => updateHeightRange(height, e.target.value)}
                          style={{
                            width: "70px",
                            padding: "4px",
                            border: "1px solid white",
                            borderRadius: "3px",
                            textAlign: "center",
                            fontWeight: "bold",
                          }}
                        />
                        <button
                          onClick={() => removeHeightRange(height)}
                          style={{
                            background: "rgba(255,255,255,0.2)",
                            border: "1px solid white",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "3px",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </th>
                  ))}
                  <th
                    style={{
                      padding: "8px",
                      border: "2px solid #c9cccf",
                      background: "#5c6ac4",
                      color: "white",
                    }}
                  >
                    <button
                      onClick={addHeightRange}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "1px solid white",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "16px",
                        padding: "4px 12px",
                        borderRadius: "3px",
                      }}
                    >
                      +
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {widthRanges.map((width, wIdx) => (
                  <tr key={width}>
                    <td
                      style={{
                        padding: "8px",
                        border: "2px solid #c9cccf",
                        background: "#5c6ac4",
                        color: "white",
                        fontWeight: "bold",
                        position: "sticky",
                        left: 0,
                        zIndex: 5,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="number"
                          value={width}
                          onChange={(e) => updateWidthRange(width, e.target.value)}
                          style={{
                            width: "70px",
                            padding: "4px",
                            border: "1px solid white",
                            borderRadius: "3px",
                            textAlign: "center",
                            fontWeight: "bold",
                          }}
                        />
                        <button
                          onClick={() => removeWidthRange(width)}
                          style={{
                            background: "rgba(255,255,255,0.2)",
                            border: "1px solid white",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "3px",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                    {heightRanges.map((height, hIdx) => {
                      const key = `${width}-${height}`;
                      const value = pivotTable[key] || "";
                      const isEditing = editingCell === key;

                      return (
                        <td
                          key={key}
                          style={{
                            padding: "4px",
                            border: "1px solid #c9cccf",
                            background: value ? "#fff" : "#f9fafb",
                            textAlign: "center",
                          }}
                          onClick={() => setEditingCell(key)}
                        >
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleCellChange(width, height, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            placeholder="€"
                            style={{
                              width: "100%",
                              padding: "6px",
                              border: isEditing ? "2px solid #5c6ac4" : "1px solid transparent",
                              borderRadius: "3px",
                              textAlign: "center",
                              background: "transparent",
                              fontSize: "13px",
                            }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ padding: "8px", border: "2px solid #c9cccf" }}></td>
                  </tr>
                ))}
                <tr>
                  <td
                    style={{
                      padding: "8px",
                      border: "2px solid #c9cccf",
                      background: "#5c6ac4",
                      color: "white",
                      position: "sticky",
                      left: 0,
                      zIndex: 5,
                    }}
                  >
                    <button
                      onClick={addWidthRange}
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "1px solid white",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "16px",
                        padding: "4px 12px",
                        borderRadius: "3px",
                        width: "100%",
                      }}
                    >
                      +
                    </button>
                  </td>
                  {heightRanges.map((h) => (
                    <td key={h} style={{ padding: "8px", border: "2px solid #c9cccf" }}></td>
                  ))}
                  <td style={{ padding: "8px", border: "2px solid #c9cccf" }}></td>
                </tr>
              </tbody>
            </table>
          </div>

          <s-box padding="base" background="subdued" borderRadius="base">
            <s-stack direction="block" gap="tight">
              <s-text variant="bodySm">
                <strong>Tips:</strong>
              </s-text>
              <s-unordered-list>
                <s-list-item>Click any cell to edit the price directly</s-list-item>
                <s-list-item>Click the header values to edit width/height ranges</s-list-item>
                <s-list-item>Use + buttons to add new rows/columns</s-list-item>
                <s-list-item>Use ✕ buttons to remove rows/columns</s-list-item>
                <s-list-item>Click "Save All Changes" when done</s-list-item>
              </s-unordered-list>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};  
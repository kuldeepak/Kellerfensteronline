import { useState, useEffect, useRef } from "react";
import { useFetcher, useNavigate, useParams, useLoaderData, useRevalidator } from "react-router";
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
      steps: {
        include: {
          options: true,
        },
        orderBy: {
          order: "asc",
        },
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
    // CREATE STEP
    // ============================================
    if (actionType === "createStep") {
      const key = formData.get("key");
      const type = formData.get("type");
      const title = formData.get("title");
      const subtitle = formData.get("subtitle") || "";
      const description = formData.get("description") || "";
      const image = formData.get("image") || "";

      const maxOrderStep = await prisma.configurationStep.findFirst({
        where: { productId },
        orderBy: { order: "desc" },
      });
      const order = (maxOrderStep?.order || 0) + 1;

      const widthMin = formData.get("widthMin") ? parseInt(formData.get("widthMin")) : null;
      const widthMax = formData.get("widthMax") ? parseInt(formData.get("widthMax")) : null;
      const heightMin = formData.get("heightMin") ? parseInt(formData.get("heightMin")) : null;
      const heightMax = formData.get("heightMax") ? parseInt(formData.get("heightMax")) : null;

      const step = await prisma.configurationStep.create({
        data: {
          productId,
          key,
          type,
          title,
          subtitle,
          description,
          image,
          order,
          widthMin,
          widthMax,
          heightMin,
          heightMax,
        },
      });

      return json({ success: true, step });
    }

    // ============================================
    // UPDATE STEP
    // ============================================
    if (actionType === "updateStep") {
      const stepId = formData.get("stepId");
      const key = formData.get("key");
      const type = formData.get("type");
      const title = formData.get("title");
      const subtitle = formData.get("subtitle") || "";
      const description = formData.get("description") || "";
      const image = formData.get("image") || "";

      const widthMin = formData.get("widthMin") ? parseInt(formData.get("widthMin")) : null;
      const widthMax = formData.get("widthMax") ? parseInt(formData.get("widthMax")) : null;
      const heightMin = formData.get("heightMin") ? parseInt(formData.get("heightMin")) : null;
      const heightMax = formData.get("heightMax") ? parseInt(formData.get("heightMax")) : null;

      const step = await prisma.configurationStep.update({
        where: { id: stepId },
        data: {
          key,
          type,
          title,
          subtitle,
          description,
          image,
          widthMin,
          widthMax,
          heightMin,
          heightMax,
        },
      });

      return json({ success: true, step });
    }

    // ============================================
    // CREATE OPTION
    // ============================================
    if (actionType === "createOption") {
      const stepId = formData.get("stepId");
      const value = formData.get("value");
      const label = formData.get("label");
      const description = formData.get("description") || "";
      const image = formData.get("image") || "";
      const price = parseFloat(formData.get("price") || 0);
      const showSteps = formData.get("showSteps") || null;

      const option = await prisma.stepOption.create({
        data: {
          stepId,
          value,
          label,
          description,
          image,
          price,
          showSteps,
        },
      });

      return json({ success: true, option });
    }

    // ============================================
    // UPDATE OPTION
    // ============================================
    if (actionType === "updateOption") {
      const optionId = formData.get("optionId");
      const value = formData.get("value");
      const label = formData.get("label");
      const description = formData.get("description") || "";
      const image = formData.get("image") || "";
      const price = parseFloat(formData.get("price") || 0);
      const showSteps = formData.get("showSteps") || null;

      const option = await prisma.stepOption.update({
        where: { id: optionId },
        data: {
          value,
          label,
          description,
          image,
          price,
          showSteps,
        },
      });

      return json({ success: true, option });
    }

    // ============================================
    // DELETE STEP
    // ============================================
    if (actionType === "deleteStep") {
      const stepId = formData.get("stepId");

      await prisma.configurationStep.delete({
        where: { id: stepId },
      });

      return json({ success: true });
    }

    // ============================================
    // DELETE OPTION
    // ============================================
    if (actionType === "deleteOption") {
      const optionId = formData.get("optionId");

      await prisma.stepOption.delete({
        where: { id: optionId },
      });

      return json({ success: true });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action Error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function ConfigureProduct() {
  const { product } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  // Refs for scrolling
  const stepFormRef = useRef(null);
  const optionFormRefs = useRef({});

  const [showStepForm, setShowStepForm] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [showOptionForm, setShowOptionForm] = useState(null);
  const [editingOption, setEditingOption] = useState(null);

  const [stepFormData, setStepFormData] = useState({
    key: "",
    type: "OPTIONS",
    title: "",
    subtitle: "",
    description: "",
    image: "",
    widthMin: "",
    widthMax: "",
    heightMin: "",
    heightMax: "",
  });

  const [optionFormData, setOptionFormData] = useState({
    value: "",
    label: "",
    description: "",
    image: "",
    price: "0",
    showSteps: "",
  });

  const [uploadingStepImage, setUploadingStepImage] = useState(false);
  const [uploadingOptionImage, setUploadingOptionImage] = useState(false);

  const isLoading = ["loading", "submitting"].includes(fetcher.state);
  const revalidator = useRevalidator();

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Success!");
      resetForms();
      revalidator.revalidate();
    } else if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data, shopify]);

  const resetForms = () => {
    setShowStepForm(false);
    setEditingStep(null);
    setShowOptionForm(null);
    setEditingOption(null);
    setStepFormData({
      key: "",
      type: "OPTIONS",
      title: "",
      subtitle: "",
      description: "",
      image: "",
      widthMin: "",
      widthMax: "",
      heightMin: "",
      heightMax: "",
    });
    setOptionFormData({
      value: "",
      label: "",
      description: "",
      image: "",
      price: "0",
      showSteps: "",
    });
  };

  const handleStepImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingStepImage(true);
    const uploadFormData = new FormData();
    uploadFormData.append("image", file);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (data.success) {
        setStepFormData({ ...stepFormData, image: data.imageUrl });
        shopify.toast.show("Image uploaded successfully");
      } else {
        shopify.toast.show(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      shopify.toast.show(`Upload error: ${error.message}`);
    } finally {
      setUploadingStepImage(false);
    }
  };

  const handleOptionImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingOptionImage(true);
    const uploadFormData = new FormData();
    uploadFormData.append("image", file);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();
      if (data.success) {
        setOptionFormData({ ...optionFormData, image: data.imageUrl });
        shopify.toast.show("Image uploaded successfully");
      } else {
        shopify.toast.show(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      shopify.toast.show(`Upload error: ${error.message}`);
    } finally {
      setUploadingOptionImage(false);
    }
  };

  const handleEditStep = (step) => {
    setEditingStep(step);
    setStepFormData({
      key: step.key,
      type: step.type,
      title: step.title,
      subtitle: step.subtitle || "",
      description: step.description || "",
      image: step.image || "",
      widthMin: step.widthMin?.toString() || "",
      widthMax: step.widthMax?.toString() || "",
      heightMin: step.heightMin?.toString() || "",
      heightMax: step.heightMax?.toString() || "",
    });
    setShowStepForm(true);

    // Scroll to form after a short delay to ensure it's rendered
    setTimeout(() => {
      stepFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }, 100);
  };

  const handleEditOption = (option, stepId) => {
    setEditingOption(option);
    setOptionFormData({
      value: option.value,
      label: option.label,
      description: option.description || "",
      image: option.image || "",
      price: option.price.toString(),
      showSteps: option.showSteps || "",
    });

    // Scroll to option form after a short delay
    setTimeout(() => {
      optionFormRefs.current[stepId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }, 100);
  };

  const handleSaveStep = () => {
    const submitData = new FormData();
    submitData.append("action", editingStep ? "updateStep" : "createStep");
    if (editingStep) submitData.append("stepId", editingStep.id);
    submitData.append("key", stepFormData.key);
    submitData.append("type", stepFormData.type);
    submitData.append("title", stepFormData.title);
    submitData.append("subtitle", stepFormData.subtitle);
    submitData.append("description", stepFormData.description);
    submitData.append("image", stepFormData.image);

    if (stepFormData.type === "MEASUREMENT") {
      submitData.append("widthMin", stepFormData.widthMin);
      submitData.append("widthMax", stepFormData.widthMax);
      submitData.append("heightMin", stepFormData.heightMin);
      submitData.append("heightMax", stepFormData.heightMax);
    }

    fetcher.submit(submitData, { method: "POST" });
  };

  const handleSaveOption = (stepId) => {
    const submitData = new FormData();
    submitData.append("action", editingOption ? "updateOption" : "createOption");
    if (editingOption) submitData.append("optionId", editingOption.id);
    submitData.append("stepId", stepId);
    submitData.append("value", optionFormData.value);
    submitData.append("label", optionFormData.label);
    submitData.append("description", optionFormData.description);
    submitData.append("image", optionFormData.image);
    submitData.append("price", optionFormData.price);
    submitData.append("showSteps", optionFormData.showSteps);

    fetcher.submit(submitData, { method: "POST" });
  };

  const handleDeleteStep = (stepId) => {
    if (confirm("Are you sure you want to delete this configuration step? This will also delete all options within it.")) {
      const submitData = new FormData();
      submitData.append("action", "deleteStep");
      submitData.append("stepId", stepId);
      fetcher.submit(submitData, { method: "POST" });
    }
  };

  const handleDeleteOption = (optionId) => {
    if (confirm("Are you sure you want to delete this option?")) {
      const submitData = new FormData();
      submitData.append("action", "deleteOption");
      submitData.append("optionId", optionId);
      fetcher.submit(submitData, { method: "POST" });
    }
  };

  if (!product) {
    return (
      <s-page heading="Product Not Found">
        <s-section>
          <s-paragraph>Product not found.</s-paragraph>
          <s-button onClick={() => navigate('/app/configurator')}>
            Back to Product List
          </s-button>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading={`Product Configuration: ${product.name}`}>
      <s-button
        slot="secondary-action"
        onClick={() => navigate('/app/configurator')}
      >
        ← Back to Products
      </s-button>

      {/* Product Overview Card */}
      <s-section>
        <s-box padding="base" borderWidth="base" borderRadius="base" background="surface">
          <s-stack direction="block" gap="tight">
            <s-heading variant="headingMd">Product Overview</s-heading>
            <s-divider />
            <s-stack direction="inline" gap="loose" style={{ marginTop: '12px' }}>
              <div style={{ flex: 1 }}>
                <s-text variant="bodySm" tone="subdued">Shopify Product ID</s-text>
                <s-text variant="bodyMd"><strong>{product.shopifyProductId}</strong></s-text>
              </div>
              <div style={{ flex: 1 }}>
                <s-text variant="bodySm" tone="subdued">Base Price</s-text>
                <s-text variant="bodyMd"><strong>€{product.basePrice.toFixed(2)}</strong></s-text>
              </div>
              <div style={{ flex: 1 }}>
                <s-text variant="bodySm" tone="subdued">Configuration Steps</s-text>
                <s-text variant="bodyMd"><strong>{product.steps.length}</strong></s-text>
              </div>
            </s-stack>
          </s-stack>
        </s-box>
      </s-section>

      {/* Configuration Steps Section */}
      <s-section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <s-heading variant="headingLg">Configuration Steps</s-heading>
          <s-button
            variant="primary"
            onClick={() => {
              const willShow = !showStepForm;
              setShowStepForm(willShow);
              setEditingStep(null);
              setStepFormData({
                key: "",
                type: "OPTIONS",
                title: "",
                subtitle: "",
                description: "",
                image: "",
                widthMin: "",
                widthMax: "",
                heightMin: "",
                heightMax: "",
              });

              // Scroll to form if opening
              if (willShow) {
                setTimeout(() => {
                  stepFormRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                  });
                }, 100);
              }
            }}
          >
            {showStepForm ? "✕ Cancel" : "+ Add New Step"}
          </s-button>
        </div>

        <s-stack direction="block" gap="base">
          {/* Step Form */}
          {showStepForm && (
            <div ref={stepFormRef} style={{ scrollMarginTop: '20px' }}>
              <s-box
                padding="loose"
                borderWidth="base"
                borderRadius="base"
                background="surface-subdued"
                style={{
                  boxShadow: editingStep ? '0 0 0 3px rgba(0, 128, 96, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  transition: 'box-shadow 0.3s ease'
                }}
              >
                <s-stack direction="block" gap="base">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <s-heading variant="headingMd">
                      {editingStep ? "✏️ Edit Step" : "➕ Create New Step"}
                    </s-heading>
                    <s-badge tone="info">{editingStep ? "Editing Mode" : "New Step"}</s-badge>
                  </div>

                  <s-divider />

                  {/* Step Type Selection - Visual Cards */}
                  <div>
                    <s-text variant="bodyMd"><strong>Step Type</strong></s-text>
                    <s-text variant="bodySm" tone="subdued">Choose how customers will interact with this step</s-text>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                      <div
                        onClick={() => setStepFormData({ ...stepFormData, type: "OPTIONS" })}
                        style={{
                          padding: '16px',
                          border: stepFormData.type === "OPTIONS" ? '2px solid #008060' : '2px solid #e1e3e5',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: stepFormData.type === "OPTIONS" ? '#f6f6f7' : '#fff',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
                        <s-text variant="bodyMd"><strong>Multiple Choice</strong></s-text>
                        <s-text variant="bodySm" tone="subdued">Let customers select from predefined options</s-text>
                      </div>
                      <div
                        onClick={() => setStepFormData({ ...stepFormData, type: "MEASUREMENT" })}
                        style={{
                          padding: '16px',
                          border: stepFormData.type === "MEASUREMENT" ? '2px solid #008060' : '2px solid #e1e3e5',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: stepFormData.type === "MEASUREMENT" ? '#f6f6f7' : '#fff',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📏</div>
                        <s-text variant="bodyMd"><strong>Measurements</strong></s-text>
                        <s-text variant="bodySm" tone="subdued">Customers enter custom width & height</s-text>
                      </div>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <s-text variant="bodyMd"><strong>📝 Basic Information</strong></s-text>
                    <s-stack direction="block" gap="base" style={{ marginTop: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px' }}>
                          <s-text variant="bodySm"><strong>Display Title</strong> <span style={{ color: '#bf0711' }}>*</span></s-text>
                        </label>
                        <s-text variant="bodySm" tone="subdued">What customers see (e.g., "Window Type", "Choose Color")</s-text>
                        <input
                          type="text"
                          value={stepFormData.title}
                          onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                          placeholder="e.g., Window Type"
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #c9cccf',
                            borderRadius: '6px',
                            marginTop: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px' }}>
                          <s-text variant="bodySm"><strong>Internal Key</strong> <span style={{ color: '#bf0711' }}>*</span></s-text>
                        </label>
                        <s-text variant="bodySm" tone="subdued">Unique identifier (lowercase, no spaces, e.g., "window_type")</s-text>
                        <input
                          type="text"
                          value={stepFormData.key}
                          onChange={(e) => setStepFormData({ ...stepFormData, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                          placeholder="e.g., window_type"
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #c9cccf',
                            borderRadius: '6px',
                            marginTop: '6px',
                            fontSize: '14px',
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px' }}>
                          <s-text variant="bodySm"><strong>Subtitle</strong> (Optional)</s-text>
                        </label>
                        <s-text variant="bodySm" tone="subdued">Step progress indicator (e.g., "Step 1 of 3")</s-text>
                        <input
                          type="text"
                          value={stepFormData.subtitle}
                          onChange={(e) => setStepFormData({ ...stepFormData, subtitle: e.target.value })}
                          placeholder="e.g., Step 1 of 3"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #c9cccf',
                            borderRadius: '6px',
                            marginTop: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px' }}>
                          <s-text variant="bodySm"><strong>Description</strong> (Optional)</s-text>
                        </label>
                        <s-text variant="bodySm" tone="subdued">Additional help text for customers</s-text>
                        <textarea
                          value={stepFormData.description}
                          onChange={(e) => setStepFormData({ ...stepFormData, description: e.target.value })}
                          placeholder="e.g., Select the type of window you need..."
                          rows="3"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #c9cccf',
                            borderRadius: '6px',
                            marginTop: '6px',
                            fontSize: '14px',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px' }}>
                          <s-text variant="bodySm"><strong>🖼️ Step Image</strong> (Optional)</s-text>
                        </label>
                        <s-text variant="bodySm" tone="subdued">Upload an image to display at the top of this step</s-text>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStepImageUpload}
                          disabled={uploadingStepImage}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px dashed #c9cccf',
                            borderRadius: '6px',
                            marginTop: '6px',
                            backgroundColor: '#fff',
                            cursor: 'pointer'
                          }}
                        />
                        {uploadingStepImage && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <s-spinner size="small" />
                            <s-text variant="bodySm">Uploading image...</s-text>
                          </div>
                        )}
                        {stepFormData.image && (
                          <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
                            <img
                              src={stepFormData.image}
                              alt="Preview"
                              style={{
                                maxWidth: '250px',
                                maxHeight: '200px',
                                borderRadius: '6px',
                                border: '1px solid #e1e3e5'
                              }}
                            />
                            <button
                              onClick={() => setStepFormData({ ...stepFormData, image: "" })}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </s-stack>
                  </div>

                  {/* Measurement Ranges (only for MEASUREMENT type) */}
                  {stepFormData.type === "MEASUREMENT" && (
                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                      <s-text variant="bodyMd"><strong>📏 Measurement Ranges (in millimeters)</strong></s-text>
                      <s-text variant="bodySm" tone="subdued">Set minimum and maximum values customers can enter</s-text>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px' }}>
                            <s-text variant="bodySm"><strong>Width - Minimum (mm)</strong></s-text>
                          </label>
                          <input
                            type="number"
                            value={stepFormData.widthMin}
                            onChange={(e) => setStepFormData({ ...stepFormData, widthMin: e.target.value })}
                            placeholder="e.g., 300"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #c9cccf',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px' }}>
                            <s-text variant="bodySm"><strong>Width - Maximum (mm)</strong></s-text>
                          </label>
                          <input
                            type="number"
                            value={stepFormData.widthMax}
                            onChange={(e) => setStepFormData({ ...stepFormData, widthMax: e.target.value })}
                            placeholder="e.g., 2000"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #c9cccf',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px' }}>
                            <s-text variant="bodySm"><strong>Height - Minimum (mm)</strong></s-text>
                          </label>
                          <input
                            type="number"
                            value={stepFormData.heightMin}
                            onChange={(e) => setStepFormData({ ...stepFormData, heightMin: e.target.value })}
                            placeholder="e.g., 400"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #c9cccf',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px' }}>
                            <s-text variant="bodySm"><strong>Height - Maximum (mm)</strong></s-text>
                          </label>
                          <input
                            type="number"
                            value={stepFormData.heightMax}
                            onChange={(e) => setStepFormData({ ...stepFormData, heightMax: e.target.value })}
                            placeholder="e.g., 2000"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #c9cccf',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <s-divider />

                  {/* Action Buttons */}
                  <s-stack direction="inline" gap="base">
                    <s-button
                      variant="primary"
                      onClick={handleSaveStep}
                      {...(isLoading ? { loading: true } : {})}
                      disabled={!stepFormData.key || !stepFormData.title}
                    >
                      {editingStep ? "💾 Update Step" : "✓ Create Step"}
                    </s-button>
                    <s-button
                      variant="tertiary"
                      onClick={() => {
                        setShowStepForm(false);
                        setEditingStep(null);
                      }}
                    >
                      Cancel
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            </div>
          )}

          {/* Existing Steps List */}
          {product.steps.length === 0 && !showStepForm ? (
            <s-box padding="loose" borderWidth="base" borderRadius="base" style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <s-heading variant="headingMd">No Configuration Steps Yet</s-heading>
              <s-text tone="subdued">Get started by creating your first configuration step above</s-text>
            </s-box>
          ) : (
            product.steps.map((step, index) => (
              <s-box
                key={step.id}
                padding="loose"
                borderWidth="base"
                borderRadius="base"
                background="surface"
              >
                <s-stack direction="block" gap="base">
                  {/* Step Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <s-badge tone="info">Step {step.order}</s-badge>
                        <s-heading variant="headingMd">{step.title}</s-heading>
                        <s-badge tone={step.type === "OPTIONS" ? "success" : "attention"}>
                          {step.type === "OPTIONS" ? "📋 Multiple Choice" : "📏 Measurements"}
                        </s-badge>
                      </div>
                      {step.subtitle && (
                        <s-text tone="subdued">{step.subtitle}</s-text>
                      )}
                    </div>
                    <s-stack direction="inline" gap="tight">
                      <s-button
                        variant="secondary"
                        onClick={() => handleEditStep(step)}
                      >
                        ✏️ Edit
                      </s-button>
                      <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleDeleteStep(step.id)}
                      >
                        🗑️ Delete
                      </s-button>
                    </s-stack>
                  </div>

                  <s-divider />

                  {/* Step Details */}
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px' }}>
                    <s-stack direction="inline" gap="loose">
                      <div>
                        <s-text variant="bodySm" tone="subdued">Internal Key</s-text>
                        <s-text variant="bodyMd" style={{ fontFamily: 'monospace', fontSize: '13px' }}>{step.key}</s-text>
                      </div>
                      {step.description && (
                        <div style={{ flex: 1 }}>
                          <s-text variant="bodySm" tone="subdued">Description</s-text>
                          <s-text variant="bodyMd">{step.description}</s-text>
                        </div>
                      )}
                    </s-stack>
                  </div>

                  {/* Step Image */}
                  {step.image && (
                    <div>
                      <s-text variant="bodySm" tone="subdued" style={{ marginBottom: '8px', display: 'block' }}>Step Image</s-text>
                      <img
                        src={step.image}
                        alt={step.title}
                        style={{
                          maxWidth: '300px',
                          maxHeight: '200px',
                          borderRadius: '6px',
                          border: '1px solid #e1e3e5'
                        }}
                      />
                    </div>
                  )}

                  {/* Measurement Ranges Display */}
                  {step.type === "MEASUREMENT" && (
                    <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '6px' }}>
                      <s-text variant="bodyMd"><strong>📏 Measurement Ranges</strong></s-text>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                        <div>
                          <s-text variant="bodySm" tone="subdued">Width Range</s-text>
                          <s-text variant="bodyMd"><strong>{step.widthMin} mm - {step.widthMax} mm</strong></s-text>
                        </div>
                        <div>
                          <s-text variant="bodySm" tone="subdued">Height Range</s-text>
                          <s-text variant="bodyMd"><strong>{step.heightMin} mm - {step.heightMax} mm</strong></s-text>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Options Section (for OPTIONS type) */}
                  {step.type === "OPTIONS" && (
                    <>
                      <s-divider />
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <s-heading variant="headingSm">Customer Choices ({step.options.length})</s-heading>
                          <s-button
                            variant="secondary"
                            size="slim"
                            onClick={() => {
                              setShowOptionForm(step.id);
                              setEditingOption(null);
                              setOptionFormData({
                                value: "",
                                label: "",
                                description: "",
                                image: "",
                                price: "0",
                                showSteps: "",
                              });

                              // Scroll to option form
                              setTimeout(() => {
                                optionFormRefs.current[step.id]?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'center',
                                  inline: 'nearest'
                                });
                              }, 100);
                            }}
                          >
                            + Add Choice
                          </s-button>
                        </div>

                        {step.options.length === 0 ? (
                          <div style={{
                            background: '#f9fafb',
                            padding: '32px',
                            borderRadius: '6px',
                            textAlign: 'center',
                            border: '2px dashed #e1e3e5'
                          }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
                            <s-text tone="subdued">No choices added yet. Add options for customers to select from.</s-text>
                          </div>
                        ) : (
                          <s-stack direction="block" gap="tight">
                            {step.options.map((option, optionIndex) => (
                              <div
                                key={option.id}
                                style={{
                                  padding: '16px',
                                  background: 'white',
                                  borderRadius: '6px',
                                  border: '1px solid #e1e3e5'
                                }}
                              >
                                <div style={{ display: 'flex', gap: '16px' }}>
                                  {/* Option Image */}
                                  {option.image && (
                                    <div style={{ flexShrink: 0 }}>
                                      <img
                                        src={option.image}
                                        alt={option.label}
                                        style={{
                                          width: '80px',
                                          height: '80px',
                                          objectFit: 'cover',
                                          borderRadius: '6px',
                                          border: '1px solid #e1e3e5'
                                        }}
                                      />
                                    </div>
                                  )}

                                  {/* Option Details */}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                      <s-text variant="bodyMd"><strong>{option.label}</strong></s-text>
                                      {option.price > 0 && (
                                        <s-badge tone="success">+€{option.price.toFixed(2)}</s-badge>
                                      )}
                                    </div>

                                    <s-text variant="bodySm" tone="subdued" style={{ fontFamily: 'monospace', fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                                      Value: {option.value}
                                    </s-text>

                                    {option.description && (
                                      <s-text variant="bodySm" style={{ display: 'block', marginBottom: '6px' }}>
                                        {option.description}
                                      </s-text>
                                    )}

                                    {option.showSteps && (
                                      <div style={{
                                        background: '#e0f2fe',
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        marginTop: '8px',
                                        display: 'inline-block'
                                      }}>
                                        <s-text variant="bodySm"><strong>Next Steps:</strong> {option.showSteps}</s-text>
                                      </div>
                                    )}
                                  </div>

                                  {/* Option Actions */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <s-button
                                      variant="secondary"
                                      size="slim"
                                      onClick={() => {
                                        setShowOptionForm(step.id);
                                        handleEditOption(option, step.id);
                                      }}
                                    >
                                      Edit
                                    </s-button>
                                    <s-button
                                      variant="tertiary"
                                      tone="critical"
                                      size="slim"
                                      onClick={() => handleDeleteOption(option.id)}
                                    >
                                      Delete
                                    </s-button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </s-stack>
                        )}

                        {/* Option Form */}
                        {showOptionForm === step.id && (
                          <div ref={(el) => optionFormRefs.current[step.id] = el} style={{ scrollMarginTop: '20px' }}>
                            <s-box
                              padding="base"
                              background="surface-subdued"
                              borderRadius="base"
                              style={{
                                marginTop: '16px',
                                boxShadow: editingOption ? '0 0 0 3px rgba(0, 128, 96, 0.3)' : 'none',
                                transition: 'box-shadow 0.3s ease'
                              }}
                            >
                              <s-stack direction="block" gap="base">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <s-heading variant="headingSm">
                                    {editingOption ? "✏️ Edit Choice" : "➕ Add New Choice"}
                                  </s-heading>
                                  <s-badge tone={editingOption ? "warning" : "info"}>
                                    {editingOption ? "Editing" : "New"}
                                  </s-badge>
                                </div>

                                <s-divider />

                                <div>
                                  <label style={{ display: 'block', marginBottom: '4px' }}>
                                    <s-text variant="bodySm"><strong>Choice Name</strong> <span style={{ color: '#bf0711' }}>*</span></s-text>
                                  </label>
                                  <s-text variant="bodySm" tone="subdued">What customers will see (e.g., "Standard Window")</s-text>
                                  <input
                                    type="text"
                                    value={optionFormData.label}
                                    onChange={(e) => setOptionFormData({ ...optionFormData, label: e.target.value })}
                                    placeholder="e.g., Standard Window"
                                    required
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px',
                                      border: '1px solid #c9cccf',
                                      borderRadius: '6px',
                                      marginTop: '6px',
                                      fontSize: '14px'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '4px' }}>
                                    <s-text variant="bodySm"><strong>Internal Value</strong> <span style={{ color: '#bf0711' }}>*</span></s-text>
                                  </label>
                                  <s-text variant="bodySm" tone="subdued">Unique code for this choice (lowercase, no spaces)</s-text>
                                  <input
                                    type="text"
                                    value={optionFormData.value}
                                    onChange={(e) => setOptionFormData({ ...optionFormData, value: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                    placeholder="e.g., standard_window"
                                    required
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px',
                                      border: '1px solid #c9cccf',
                                      borderRadius: '6px',
                                      marginTop: '6px',
                                      fontSize: '14px',
                                      fontFamily: 'monospace'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '4px' }}>
                                    <s-text variant="bodySm"><strong>Description</strong> (Optional)</s-text>
                                  </label>
                                  <s-text variant="bodySm" tone="subdued">Additional details to help customers decide</s-text>
                                  <input
                                    type="text"
                                    value={optionFormData.description}
                                    onChange={(e) => setOptionFormData({ ...optionFormData, description: e.target.value })}
                                    placeholder="e.g., Perfect for rectangular windows"
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px',
                                      border: '1px solid #c9cccf',
                                      borderRadius: '6px',
                                      marginTop: '6px',
                                      fontSize: '14px'
                                    }}
                                  />
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '4px' }}>
                                    <s-text variant="bodySm"><strong>💰 Additional Price</strong></s-text>
                                  </label>
                                  <s-text variant="bodySm" tone="subdued">Extra cost for this choice (leave 0 for no additional charge)</s-text>
                                  <div style={{ position: 'relative', marginTop: '6px' }}>
                                    <span style={{
                                      position: 'absolute',
                                      left: '12px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      fontSize: '14px',
                                      color: '#6b7280'
                                    }}>€</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={optionFormData.price}
                                      onChange={(e) => setOptionFormData({ ...optionFormData, price: e.target.value })}
                                      placeholder="0.00"
                                      style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 28px',
                                        border: '1px solid #c9cccf',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                      }}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '4px' }}>
                                    <s-text variant="bodySm"><strong>🖼️ Choice Image</strong> (Optional)</s-text>
                                  </label>
                                  <s-text variant="bodySm" tone="subdued">Visual representation of this choice</s-text>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleOptionImageUpload}
                                    disabled={uploadingOptionImage}
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px',
                                      border: '2px dashed #c9cccf',
                                      borderRadius: '6px',
                                      marginTop: '6px',
                                      backgroundColor: '#fff',
                                      cursor: 'pointer'
                                    }}
                                  />
                                  {uploadingOptionImage && (
                                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <s-spinner size="small" />
                                      <s-text variant="bodySm">Uploading image...</s-text>
                                    </div>
                                  )}
                                  {optionFormData.image && (
                                    <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
                                      <img
                                        src={optionFormData.image}
                                        alt="Preview"
                                        style={{
                                          maxWidth: '200px',
                                          maxHeight: '150px',
                                          borderRadius: '6px',
                                          border: '1px solid #e1e3e5'
                                        }}
                                      />
                                      <button
                                        onClick={() => setOptionFormData({ ...optionFormData, image: "" })}
                                        style={{
                                          position: 'absolute',
                                          top: '8px',
                                          right: '8px',
                                          background: 'rgba(0,0,0,0.7)',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '50%',
                                          width: '24px',
                                          height: '24px',
                                          cursor: 'pointer',
                                          fontSize: '14px'
                                        }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <label style={{ display: 'block', marginBottom: '4px' }}>
                                    <s-text variant="bodySm"><strong>🔀 Conditional Flow</strong> (Advanced)</s-text>
                                  </label>
                                  <s-text variant="bodySm" tone="subdued">Show specific next steps when this choice is selected</s-text>
                                  <s-text variant="bodySm" tone="subdued" style={{ display: 'block', marginTop: '4px', fontStyle: 'italic' }}>
                                    Format: ["step_key_1", "step_key_2"] or leave empty to show all steps
                                  </s-text>
                                  <input
                                    type="text"
                                    value={optionFormData.showSteps}
                                    onChange={(e) => setOptionFormData({ ...optionFormData, showSteps: e.target.value })}
                                    placeholder='e.g., ["color_selection", "measurements"]'
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px',
                                      border: '1px solid #c9cccf',
                                      borderRadius: '6px',
                                      marginTop: '6px',
                                      fontSize: '14px',
                                      fontFamily: 'monospace'
                                    }}
                                  />
                                </div>

                                <s-divider />

                                <s-stack direction="inline" gap="base">
                                  <s-button
                                    variant="primary"
                                    onClick={() => handleSaveOption(step.id)}
                                    {...(isLoading ? { loading: true } : {})}
                                    disabled={!optionFormData.value || !optionFormData.label}
                                  >
                                    {editingOption ? "💾 Update Choice" : "✓ Save Choice"}
                                  </s-button>
                                  <s-button
                                    variant="tertiary"
                                    onClick={() => {
                                      setShowOptionForm(null);
                                      setEditingOption(null);
                                    }}
                                  >
                                    Cancel
                                  </s-button>
                                </s-stack>
                              </s-stack>
                            </s-box>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </s-stack>
              </s-box>
            ))
          )}
        </s-stack>
      </s-section>

      {/* Help Section */}
      <s-section slot="aside">
        <s-box padding="base" borderWidth="base" borderRadius="base" background="surface">
          <s-stack direction="block" gap="base">
            <s-heading variant="headingSm">💡 Quick Tips</s-heading>
            <s-divider />
            <s-stack direction="block" gap="tight">
              <div>
                <s-text variant="bodySm"><strong>✓ Step Types:</strong></s-text>
                <s-text variant="bodySm" tone="subdued">Use "Multiple Choice" for predefined options, "Measurements" for custom dimensions</s-text>
              </div>
              <div>
                <s-text variant="bodySm"><strong>✓ Images:</strong></s-text>
                <s-text variant="bodySm" tone="subdued">Add images to help customers visualize their choices</s-text>
              </div>
              <div>
                <s-text variant="bodySm"><strong>✓ Pricing:</strong></s-text>
                <s-text variant="bodySm" tone="subdued">Set additional costs for premium options</s-text>
              </div>
              <div>
                <s-text variant="bodySm"><strong>✓ Flow Control:</strong></s-text>
                <s-text variant="bodySm" tone="subdued">Use conditional steps to create dynamic configuration paths</s-text>
              </div>
            </s-stack>
          </s-stack>
        </s-box>

        <s-box padding="base" borderWidth="base" borderRadius="base" background="surface" style={{ marginTop: '16px' }}>
          <s-stack direction="block" gap="tight">
            <s-heading variant="headingSm">📚 Best Practices</s-heading>
            <s-divider />
            <s-unordered-list>
              <s-list-item>Keep step titles clear and concise</s-list-item>
              <s-list-item>Use descriptive labels for all choices</s-list-item>
              <s-list-item>Test the flow from a customer's perspective</s-list-item>
              <s-list-item>Add images whenever possible</s-list-item>
            </s-unordered-list>
          </s-stack>
        </s-box>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
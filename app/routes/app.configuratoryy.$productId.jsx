import { useState, useEffect } from "react";
import { useFetcher, useNavigate, useParams, useLoaderData, useRevalidator } from "react-router";
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
      // window.location.reload();
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
      console.log("data", data);
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
  };

  const handleEditOption = (option) => {
    setEditingOption(option);
    setOptionFormData({
      value: option.value,
      label: option.label,
      description: option.description || "",
      image: option.image || "",
      price: option.price.toString(),
      showSteps: option.showSteps || "",
    });
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
    if (confirm("Are you sure you want to delete this step?")) {
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
            Back to List
          </s-button>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading={`Configure: ${product.name}`}>
      <s-button
        slot="secondary-action"
        onClick={() => navigate('/app/configurator')}
      >
        Back to List
      </s-button>

      <s-section heading="Product Information">
        <s-stack direction="block" gap="tight">
          <s-text><strong>Shopify ID:</strong> {product.shopifyProductId}</s-text>
          <s-text><strong>Base Price:</strong> {product.basePrice.toFixed(2)} €</s-text>
          <s-text><strong>Total Steps:</strong> {product.steps.length}</s-text>
        </s-stack>
      </s-section>

      <s-section heading="Configuration Steps">
        <s-stack direction="block" gap="base">

          {product.steps.length === 0 ? (
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-paragraph>No steps configured yet. Add your first step below.</s-paragraph>
            </s-box>
          ) : (
            product.steps.map((step) => (
              <s-box
                key={step.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="tight">
                  <s-stack direction="inline" gap="base" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <s-heading>{step.order}. {step.title}</s-heading>
                    <s-stack direction="inline" gap="tight">
                      <s-button
                        variant="secondary"
                        onClick={() => handleEditStep(step)}
                      >
                        Edit Step
                      </s-button>
                      <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleDeleteStep(step.id)}
                      >
                        Delete
                      </s-button>
                    </s-stack>
                  </s-stack>

                  <s-text><strong>Key:</strong> {step.key}</s-text>
                  <s-text><strong>Type:</strong> {step.type}</s-text>
                  {step.subtitle && <s-text><strong>Subtitle:</strong> {step.subtitle}</s-text>}
                  {step.image && (
                    <div>
                      <s-text><strong>Image:</strong></s-text>
                      <img src={step.image} alt={step.title} style={{ maxWidth: '200px', marginTop: '8px', borderRadius: '4px' }} />
                    </div>
                  )}

                  {step.type === "MEASUREMENT" && (
                    <s-stack direction="block" gap="tight">
                      <s-text><strong>Width:</strong> {step.widthMin} - {step.widthMax} mm</s-text>
                      <s-text><strong>Height:</strong> {step.heightMin} - {step.heightMax} mm</s-text>
                    </s-stack>
                  )}

                  {step.type === "OPTIONS" && (
                    <>
                      <s-heading variant="headingSm">Options:</s-heading>
                      {step.options.length === 0 ? (
                        <s-text tone="subdued">No options yet</s-text>
                      ) : (
                        <s-stack direction="block" gap="tight">
                          {step.options.map((option) => (
                            <s-box
                              key={option.id}
                              padding="tight"
                              background="subdued"
                              borderRadius="base"
                            >
                              <s-stack direction="inline" gap="base" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                                  <s-text><strong>{option.label}</strong> (value: {option.value})</s-text>
                                  <s-text>Price: +{option.price.toFixed(2)} €</s-text>
                                  {option.description && <s-text variant="bodySm">{option.description}</s-text>}
                                  {option.showSteps && (
                                    <s-text variant="bodySm"><strong>Next Steps:</strong> {option.showSteps}</s-text>
                                  )}
                                  {option.image && (
                                    <img src={option.image} alt={option.label} style={{ maxWidth: '150px', marginTop: '4px', borderRadius: '4px' }} />
                                  )}
                                </s-stack>
                                <s-stack direction="inline" gap="tight">
                                  <s-button
                                    variant="secondary"
                                    onClick={() => {
                                      setShowOptionForm(step.id);
                                      handleEditOption(option);
                                    }}
                                  >
                                    Edit
                                  </s-button>
                                  <s-button
                                    variant="tertiary"
                                    tone="critical"
                                    onClick={() => handleDeleteOption(option.id)}
                                  >
                                    Delete
                                  </s-button>
                                </s-stack>
                              </s-stack>
                            </s-box>
                          ))}
                        </s-stack>
                      )}

                      <s-button
                        variant="secondary"
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
                        }}
                      >
                        Add New Option
                      </s-button>

                      {/* Option Form */}
                      {showOptionForm === step.id && (
                        <s-box padding="base" background="subdued" borderRadius="base">
                          <s-stack direction="block" gap="base">
                            <s-heading variant="headingSm">
                              {editingOption ? "Edit Option" : "Add New Option"}
                            </s-heading>

                            <div>
                              <s-text variant="bodySm"><strong>Value *</strong> (Internal identifier, e.g., 'normal')</s-text>
                              <input
                                type="text"
                                value={optionFormData.value}
                                onChange={(e) => setOptionFormData({ ...optionFormData, value: e.target.value })}
                                placeholder="normal"
                                style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                              />
                            </div>

                            <div>
                              <s-text variant="bodySm"><strong>Label *</strong> (Display name)</s-text>
                              <input
                                type="text"
                                value={optionFormData.label}
                                onChange={(e) => setOptionFormData({ ...optionFormData, label: e.target.value })}
                                placeholder="Normal Window"
                                style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                              />
                            </div>

                            <div>
                              <s-text variant="bodySm">Description (Optional)</s-text>
                              <input
                                type="text"
                                value={optionFormData.description}
                                onChange={(e) => setOptionFormData({ ...optionFormData, description: e.target.value })}
                                placeholder="For straight windows without inclination"
                                style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                              />
                            </div>

                            <div>
                              <s-text variant="bodySm"><strong>Image</strong></s-text>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleOptionImageUpload}
                                disabled={uploadingOptionImage}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #c9cccf',
                                  borderRadius: '4px',
                                  marginTop: '4px',
                                  backgroundColor: '#fff'
                                }}
                              />
                              {uploadingOptionImage && <s-text variant="bodySm">Uploading...</s-text>}
                              {optionFormData.image && (
                                <div style={{ marginTop: '8px' }}>
                                  <img src={optionFormData.image} alt="Preview" style={{ maxWidth: '200px', borderRadius: '4px' }} />
                                </div>
                              )}
                            </div>

                            <div>
                              <s-text variant="bodySm"><strong>Additional Price</strong> (€)</s-text>
                              <input
                                type="number"
                                step="0.01"
                                value={optionFormData.price}
                                onChange={(e) => setOptionFormData({ ...optionFormData, price: e.target.value })}
                                placeholder="0.00"
                                style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                              />
                            </div>

                            <div>
                              <s-text variant="bodySm"><strong>Next Steps (Conditional Flow)</strong></s-text>
                              <s-text variant="bodySm" tone="subdued">
                                Format: ["step_key_1", "step_key_2", "masse"]
                              </s-text>
                              <input
                                type="text"
                                value={optionFormData.showSteps}
                                onChange={(e) => setOptionFormData({ ...optionFormData, showSteps: e.target.value })}
                                placeholder='["befestigung", "masse"]'
                                style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                              />
                            </div>

                            <s-stack direction="inline" gap="base">
                              <s-button
                                onClick={() => handleSaveOption(step.id)}
                                {...(isLoading ? { loading: true } : {})}
                                disabled={!optionFormData.value || !optionFormData.label}
                              >
                                {editingOption ? "Update Option" : "Save Option"}
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
                      )}
                    </>
                  )}
                </s-stack>
              </s-box>
            ))
          )}

          <s-button onClick={() => {
            setShowStepForm(!showStepForm);
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
          }}>
            {showStepForm ? "Cancel" : "Add New Step"}
          </s-button>

          {/* Step Form */}
          {showStepForm && (
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>{editingStep ? "Edit Step" : "Create New Step"}</s-heading>

                <div>
                  <s-text variant="bodySm"><strong>Key *</strong> (Internal identifier)</s-text>
                  <input
                    type="text"
                    value={stepFormData.key}
                    onChange={(e) => setStepFormData({ ...stepFormData, key: e.target.value })}
                    placeholder="fenstertyp"
                    style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <s-text variant="bodySm"><strong>Type *</strong></s-text>
                  <select
                    value={stepFormData.type}
                    onChange={(e) => setStepFormData({ ...stepFormData, type: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                  >
                    <option value="OPTIONS">Options (Multiple choices)</option>
                    <option value="MEASUREMENT">Measurement (Width & Height)</option>
                  </select>
                </div>
                <div>
                  <s-text variant="bodySm"><strong>Title *</strong></s-text>
                  <input
                    type="text"
                    value={stepFormData.title}
                    onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                    placeholder="Fenstertyp"
                    style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <s-text variant="bodySm">Subtitle</s-text>
                  <input
                    type="text"
                    value={stepFormData.subtitle}
                    onChange={(e) => setStepFormData({ ...stepFormData, subtitle: e.target.value })}
                    placeholder="Schritt 1 von max. 6"
                    style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <s-text variant="bodySm">Description</s-text>
                  <textarea
                    value={stepFormData.description}
                    onChange={(e) => setStepFormData({ ...stepFormData, description: e.target.value })}
                    placeholder="Optional description"
                    rows="2"
                    style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <s-text variant="bodySm"><strong>Image</strong></s-text>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleStepImageUpload}
                    disabled={uploadingStepImage}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #c9cccf',
                      borderRadius: '4px',
                      marginTop: '4px',
                      backgroundColor: '#fff'
                    }}
                  />
                  {uploadingStepImage && <s-text variant="bodySm">Uploading...</s-text>}
                  {stepFormData.image && (
                    <div style={{ marginTop: '8px' }}>
                      <img src={stepFormData.image} alt="Preview" style={{ maxWidth: '200px', borderRadius: '4px' }} />
                    </div>
                  )}
                </div>

                {stepFormData.type === "MEASUREMENT" && (
                  <>
                    <s-heading variant="headingSm">Measurement Ranges (mm)</s-heading>
                    <s-stack direction="inline" gap="base">
                      <div style={{ width: '48%' }}>
                        <s-text variant="bodySm">Width Min</s-text>
                        <input
                          type="number"
                          value={stepFormData.widthMin}
                          onChange={(e) => setStepFormData({ ...stepFormData, widthMin: e.target.value })}
                          placeholder="300"
                          style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                        />
                      </div>
                      <div style={{ width: '48%' }}>
                        <s-text variant="bodySm">Width Max</s-text>
                        <input
                          type="number"
                          value={stepFormData.widthMax}
                          onChange={(e) => setStepFormData({ ...stepFormData, widthMax: e.target.value })}
                          placeholder="1500"
                          style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                        />
                      </div>
                    </s-stack>
                    <s-stack direction="inline" gap="base">
                      <div style={{ width: '48%' }}>
                        <s-text variant="bodySm">Height Min</s-text>
                        <input
                          type="number"
                          value={stepFormData.heightMin}
                          onChange={(e) => setStepFormData({ ...stepFormData, heightMin: e.target.value })}
                          placeholder="400"
                          style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                        />
                      </div>
                      <div style={{ width: '48%' }}>
                        <s-text variant="bodySm">Height Max</s-text>
                        <input
                          type="number"
                          value={stepFormData.heightMax}
                          onChange={(e) => setStepFormData({ ...stepFormData, heightMax: e.target.value })}
                          placeholder="1500"
                          style={{ width: '100%', padding: '8px', border: '1px solid #c9cccf', borderRadius: '4px', marginTop: '4px' }}
                        />
                      </div>
                    </s-stack>
                  </>
                )}

                <s-stack direction="inline" gap="base">
                  <s-button
                    onClick={handleSaveStep}
                    {...(isLoading ? { loading: true } : {})}
                    disabled={!stepFormData.key || !stepFormData.title}
                  >
                    {editingStep ? "Update Step" : "Create Step"}
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
          )}
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Tips">
        <s-unordered-list>
          <s-list-item>Use descriptive keys (e.g., 'fenstertyp')</s-list-item>
          <s-list-item>Upload images for better user experience</s-list-item>
          <s-list-item>Set conditional flow in options to control navigation</s-list-item>
          <s-list-item>Measurement steps require min/max values</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

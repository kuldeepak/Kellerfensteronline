import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      return json({ success: false, error: "No image file provided" }, { status: 400 });
    }

    // STEP 1: Create staged upload
    const stagedUploadResponse = await admin.graphql(
      `#graphql
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters { name value }
            }
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          input: [{
            resource: "IMAGE",
            filename: imageFile.name,
            mimeType: imageFile.type,
            httpMethod: "POST",
          }],
        },
      }
    );

    const stagedData = await stagedUploadResponse.json();
    if (stagedData.data?.stagedUploadsCreate?.userErrors?.length > 0) {
      return json({ success: false, error: stagedData.data.stagedUploadsCreate.userErrors[0].message }, { status: 500 });
    }

    const stagedTarget = stagedData.data?.stagedUploadsCreate?.stagedTargets?.[0];

    // STEP 2: Upload file to Shopify's staging storage (S3/GCS)
    const uploadFormData = new FormData();
    stagedTarget.parameters.forEach(({ name, value }) => {
      uploadFormData.append(name, value);
    });
    uploadFormData.append("file", imageFile);

    const uploadResponse = await fetch(stagedTarget.url, {
      method: "POST",
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      return json({ success: false, error: "Failed to upload file to staging area" }, { status: 500 });
    }

    // STEP 3: Register the file in Shopify
    const fileCreateResponse = await admin.graphql(
      `#graphql
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files { id }
            userErrors { field message }
          }
        }
      `,
      {
        variables: {
          files: [{
            originalSource: stagedTarget.resourceUrl,
            contentType: "IMAGE",
          }],
        },
      }
    );

    const fileData = await fileCreateResponse.json();
    if (fileData.data?.fileCreate?.userErrors?.length > 0) {
      return json({ success: false, error: fileData.data.fileCreate.userErrors[0].message }, { status: 500 });
    }

    const fileId = fileData.data?.fileCreate?.files?.[0]?.id;

    // STEP 4: Poll for the URL (Wait for processing to finish)
    // Shopify processes images in the background; we check every 2 seconds.
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!imageUrl && attempts < maxAttempts) {
      // Sleep for 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const checkFileResponse = await admin.graphql(
        `#graphql
          query getFile($id: ID!) {
            node(id: $id) {
              ... on MediaImage {
                fileStatus
                image { url }
              }
            }
          }
        `,
        { variables: { id: fileId } }
      );

      const checkFileData = await checkFileResponse.json();
      const mediaNode = checkFileData.data?.node;

      if (mediaNode?.fileStatus === "READY" && mediaNode.image?.url) {
        imageUrl = mediaNode.image.url;
      } else if (mediaNode?.fileStatus === "FAILED") {
        return json({ success: false, error: "Shopify failed to process this image." }, { status: 500 });
      }

      attempts++;
    }

    if (!imageUrl) {
      return json({
        success: false,
        error: "Processing timeout. The image is uploaded but the URL is not ready yet."
      }, { status: 202 });
    }

    return json({ success: true, imageUrl });

  } catch (error) {
    console.error("Action Error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
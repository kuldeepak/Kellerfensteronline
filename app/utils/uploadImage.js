export async function uploadImageToShopify(admin, imageFile) {
  try {
    // Create staged upload
    const stagedUploadMutation = `
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters {
                name
                value
              }
            }
          }
        }
      `;

    const stagedUploadResponse = await admin.graphql(stagedUploadMutation, {
      variables: {
        input: [
          {
            resource: "FILE",
            filename: imageFile.name,
            mimeType: imageFile.type,
            httpMethod: "POST",
          },
        ],
      },
    });

    const stagedUploadData = await stagedUploadResponse.json();
    const stagedTarget = stagedUploadData.data.stagedUploadsCreate.stagedTargets[0];

    // Upload file to staged URL
    const formData = new FormData();
    stagedTarget.parameters.forEach(({ name, value }) => {
      formData.append(name, value);
    });
    formData.append("file", imageFile);

    await fetch(stagedTarget.url, {
      method: "POST",
      body: formData,
    });

    // Create file in Shopify
    const fileCreateMutation = `
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
              ... on MediaImage {
                id
                image {
                  url
                }
              }
            }
          }
        }
      `;

    const fileCreateResponse = await admin.graphql(fileCreateMutation, {
      variables: {
        files: [
          {
            originalSource: stagedTarget.resourceUrl,
            contentType: "IMAGE",
          },
        ],
      },
    });

    const fileCreateData = await fileCreateResponse.json();
    console.log("fileCreateData", fileCreateData);
    return fileCreateData.data.fileCreate.files[0].image.url;
  } catch (error) {
    console.error("Image upload error:", error);
    throw error;
  }
}
export const expireAccessToken = () => {
    // 1. Find the first key that starts with your prefix
  const targetKey = Object.keys(localStorage).find(key => key.startsWith("oidc.user"));

  if (!targetKey) {
    console.warn(`Cannot expire access token! No localStorage key found starting with prefix: "oidc.user"`);
    return;
  }

  // 2. Retrieve the raw string value
  const rawData = localStorage.getItem(targetKey);
  if (!rawData) return;

  try {
    // 3. Parse the JSON string into your expected type
    const parsedData = JSON.parse(rawData);

    // 4. Manipulate the object using your callback function
    parsedData["expires_at"] = parsedData["expires_at"] - 4600

    // 5. Save the updated object back to the exact same key
    localStorage.setItem(targetKey, JSON.stringify(parsedData));
    
    console.log(`Successfully updated storage key to expire access token: "${targetKey}"`);
  } catch (error) {
    console.error(`Cannot expire access token! Failed to parse or save JSON for key "${targetKey}":`, error);
  }
}
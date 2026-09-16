// api/proxy.js
export default async function handler(req, res) {
  // 1. Get the secret Google Script URL from Vercel's environment variables
  const scriptURL = process.env.GOOGLE_SCRIPT_URL;

  // 2. Check if the variable is set correctly
  if (!scriptURL) {
    return res.status(500).json({ error: "Server configuration error: GOOGLE_SCRIPT_URL is not set." });
  }

  // 3. Handle both GET (for fetching data) and POST (for adding/editing/deleting)
  try {
    let response;
    
    if (req.method === 'GET') {
      // Forward the query parameters (e.g., ?action=get)
      const queryString = new URLSearchParams(req.query).toString();
      response = await fetch(`${scriptURL}?${queryString}`, {
        method: 'GET',
      });
    } 
    else if (req.method === 'POST') {
      // Vercel automatically parses the request body, so we can forward it directly
      // The body should be in URL-encoded format to avoid CORS preflight issues
      const bodyData = new URLSearchParams(req.body).toString();
      
      response = await fetch(scriptURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyData,
      });
    } 
    else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // 4. Get the response from Google and send it back to the client
    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
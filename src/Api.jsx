const BASE_URL =
  "https://script.google.com/macros/s/AKfycbxvR-hvXNxc8bWkGUMccsGOsPyIYj15sjbFEpkk3yk9IwRfZzw8foNGjrNlDkRdNy8l/exec";

export async function checkIn(payload) {
  const response = await fetch(`${BASE_URL}?path=presence/checkin`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

// Di dalam file Api.js
export const sendGps = async (payload) => {
  const url = `${BASE_URL}?path=sensor/gps`;
  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.json();
};

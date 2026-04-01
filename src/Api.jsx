export const BASE_URL =
  "https://script.google.com/macros/s/AKfycbyIhTyCOmVcCoq4ooTBqh1xpLwD4j5paaU1yzqjyPPEwa6X70Ho5J8Ykkf9ZoO1Of5H/exec";

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

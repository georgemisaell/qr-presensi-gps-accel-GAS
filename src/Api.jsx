export const BASE_URL =
  "https://script.google.com/macros/s/AKfycbwpEqKnQouDhcYQsQfJFVFjw486G3Ilxzi12cGpaKxsGmgR-_4iABEB6Y3AdiB2kZI2dg/exec";
  
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

export const BASE_URL =
  "https://script.google.com/macros/s/AKfycbw7Fl6x4nLfzZWD9tO8OLOOODujF0QvPPhJANrTPM-79oI5G2n7tVNKZh2hVL-oyC_S/exec";

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

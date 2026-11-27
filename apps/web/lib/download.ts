/** Save JSON as a file in the browser. Nothing leaves the device. */
export function downloadJson(filename: string, data: unknown) {
  const text = JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
